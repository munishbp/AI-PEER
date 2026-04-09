//
// VisionContext.tsx — react context for vision state management
//
// model loading is handled by useTensorflowModel hook in the component
// context provides react state for tracking, form analysis, and re-renders
//

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VisionState, Pose, FormFeedback, FormViolation } from './types';
import { analyzePose } from './FormAnalyzer';
import { RepCounter, RepHistoryEntry } from './RepCounter';
import { getExerciseRules } from './exercises';
import { ExerciseRule } from './exercises/types';
import { isConfident } from './exercises/utils';

/** Tracking lifecycle state machine.
 *  - 'idle': nothing running
 *  - 'waiting_for_gesture': camera + pose pipeline up; gesture detector
 *    watching for "both wrists above both shoulders by ≥15% torso for ≥500ms"
 *  - 'countdown': gesture confirmed; 5-second TTS countdown is running; rep
 *    counter and form analysis are NOT yet active
 *  - 'tracking': rep counter + form analysis active; this is the legacy
 *    "isTracking" state */
export type TrackingMode = 'idle' | 'waiting_for_gesture' | 'countdown' | 'tracking';

type VisionContextValue = {
  state: VisionState;
  trackingMode: TrackingMode;
  countdownSecondsLeft: number | null;
  repCount: number | null;
  targetReps: number | null;
  debugAngle: number | null;
  debugPhase: string | null;
  debugConfidences: string | null;
  debugPositions: string | null;
  setModelReady: (ready: boolean) => void;
  /** Begin pose tracking immediately. Bypasses the gesture flow — use
   *  startGestureWatch instead for the standard arms-overhead confirmation. */
  startTracking: (exerciseId: string) => void;
  /** Run camera + pose pipeline in 'waiting_for_gesture' mode. Once the user
   *  holds both arms overhead for 500ms, the context internally transitions to
   *  'countdown' (5s) and then to 'tracking', at which point startTracking's
   *  effects (rep counter init, form analysis) take over. */
  startGestureWatch: (exerciseId: string) => void;
  stopTracking: () => void;
  // accepts an already-parsed pose from the frame processor worklet
  handlePoseResult: (pose: Pose | null) => void;
  // returns a snapshot of the current rep counter's per-rep history. callers
  // must invoke this BEFORE stopTracking() since stopTracking resets the
  // counter and discards the history. exposed as a getter (not a state field)
  // to avoid re-rendering every consumer on each rep increment.
  getRepHistory: () => RepHistoryEntry[];
};

const VisionContext = createContext<VisionContextValue | null>(null);

const initialState: VisionState = {
  isModelDownloaded: true,
  isModelLoaded: false,
  isTracking: false,
  downloadProgress: 100,
  error: null,
  currentPose: null,
  currentFeedback: null,
};

// throttle state updates to ~5hz so we don't spam re-renders
const STATE_UPDATE_INTERVAL = 200;

// a form-check violation must be continuously failing for at least this many
// ms before we surface it. catches single-frame keypoint glitches without
// hiding sustained out-of-form positions.
const VIOLATION_SMOOTHING_MS = 300;

// gesture must be sustained for at least this many ms before we count it as
// confirmed. prevents stray frames from prematurely triggering the countdown.
const GESTURE_HOLD_MS = 500;

// length of the spoken countdown that runs after a gesture is confirmed.
const COUNTDOWN_SECONDS = 5;

export function VisionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisionState>(initialState);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('idle');
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState<number | null>(null);
  const [repCount, setRepCount] = useState<number | null>(null);
  const [targetReps, setTargetReps] = useState<number | null>(null);
  const [debugAngle, setDebugAngle] = useState<number | null>(null);
  const [debugPhase, setDebugPhase] = useState<string | null>(null);
  const [debugConfidences, setDebugConfidences] = useState<string | null>(null);
  const [debugPositions, setDebugPositions] = useState<string | null>(null);

  // refs for stable callback identity
  const isTrackingRef = useRef(false);
  const exerciseIdRef = useRef<string | null>(null);
  const lastStateUpdateRef = useRef(0);
  const pendingPoseRef = useRef<Pose | null>(null);
  const pendingFeedbackRef = useRef<FormFeedback | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const activeRulesRef = useRef<ExerciseRule | null>(null);
  // per-violation start timestamps used by the 300ms smoother. cleared on
  // start/stop tracking. keyed by violation message — bilateral exercises with
  // duplicate messages (e.g. knee bends "Bend your knees more" on left + right)
  // collapse to one entry, which matches how feedbackEvents key by message too.
  const violationStartTimesRef = useRef<Map<string, number>>(new Map());
  // mirror of trackingMode for use inside handlePoseResult (which has stable
  // identity and can't read state directly without re-creation).
  const trackingModeRef = useRef<TrackingMode>('idle');
  // exerciseId queued during the gesture/countdown phases — startTracking
  // gets called with this once the countdown completes.
  const pendingExerciseIdRef = useRef<string | null>(null);
  // first frame in which the arms-overhead gesture was detected continuously.
  // null = not currently in a gesture detection. used by the 500ms hold check.
  const gestureFirstSeenAtRef = useRef<number | null>(null);
  // pending setTimeouts from the countdown ladder; cleared on stopTracking
  // and on startGestureWatch so a new flow doesn't fire stale ticks.
  const countdownTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // keep the ref in sync with state for use in stable callbacks
  useEffect(() => {
    trackingModeRef.current = trackingMode;
  }, [trackingMode]);

  const setModelReady = useCallback((ready: boolean) => {
    setState((s) => ({ ...s, isModelLoaded: ready }));
  }, []);

  // shared internal: actually flip into 'tracking' mode and init the rep
  // counter. called from both the public startTracking (immediate) path and
  // from the countdown ladder once the spoken countdown finishes.
  const enterTrackingMode = useCallback((exerciseId: string) => {
    exerciseIdRef.current = exerciseId;
    isTrackingRef.current = true;
    violationStartTimesRef.current.clear();

    const rules = getExerciseRules(exerciseId);
    activeRulesRef.current = rules ?? null;

    if (rules?.repConfig) {
      repCounterRef.current = new RepCounter(rules.repConfig);
      setRepCount(0);
      setTargetReps(rules.repConfig.targetReps);
    } else {
      repCounterRef.current = null;
      setRepCount(null);
      setTargetReps(null);
    }

    setTrackingMode('tracking');
    setCountdownSecondsLeft(null);
    setState((s) => ({
      ...s,
      isTracking: true,
      currentPose: null,
      currentFeedback: null,
      error: null,
    }));
  }, []);

  const startTracking = useCallback(
    (exerciseId: string) => {
      // public bypass path — clears any pending gesture/countdown state and
      // jumps straight into tracking. screens that want the gesture flow
      // should call startGestureWatch instead.
      pendingExerciseIdRef.current = null;
      gestureFirstSeenAtRef.current = null;
      for (const t of countdownTimeoutsRef.current) clearTimeout(t);
      countdownTimeoutsRef.current = [];
      enterTrackingMode(exerciseId);
    },
    [enterTrackingMode]
  );

  const getRepHistory = useCallback((): RepHistoryEntry[] => {
    return repCounterRef.current?.getRepHistory() ?? [];
  }, []);

  const stopTracking = useCallback(() => {
    exerciseIdRef.current = null;
    isTrackingRef.current = false;
    pendingExerciseIdRef.current = null;
    gestureFirstSeenAtRef.current = null;
    for (const t of countdownTimeoutsRef.current) clearTimeout(t);
    countdownTimeoutsRef.current = [];
    repCounterRef.current?.reset();
    repCounterRef.current = null;
    violationStartTimesRef.current.clear();
    setTrackingMode('idle');
    setCountdownSecondsLeft(null);
    setRepCount(null);
    setTargetReps(null);
    setState((s) => ({
      ...s,
      isTracking: false,
      currentPose: null,
      currentFeedback: null,
    }));
  }, []);

  // schedules the 5→4→3→2→1→tracking ladder. each tick updates
  // countdownSecondsLeft so a UI overlay can render the current count and
  // the screen's TTS effect can speak it. on the final tick, we transition
  // into tracking mode (initializing the rep counter) and clear the ladder.
  const beginCountdown = useCallback(() => {
    for (const t of countdownTimeoutsRef.current) clearTimeout(t);
    countdownTimeoutsRef.current = [];
    setTrackingMode('countdown');
    setCountdownSecondsLeft(COUNTDOWN_SECONDS);

    for (let i = 1; i <= COUNTDOWN_SECONDS; i++) {
      const t = setTimeout(() => {
        const remaining = COUNTDOWN_SECONDS - i;
        if (remaining > 0) {
          setCountdownSecondsLeft(remaining);
        } else {
          // countdown done — flip into tracking
          const exerciseId = pendingExerciseIdRef.current;
          pendingExerciseIdRef.current = null;
          if (exerciseId) {
            enterTrackingMode(exerciseId);
          } else {
            // no queued exerciseId means the gesture flow was cancelled mid-
            // countdown — bail out cleanly back to idle
            setTrackingMode('idle');
            setCountdownSecondsLeft(null);
          }
        }
      }, i * 1000);
      countdownTimeoutsRef.current.push(t);
    }
  }, [enterTrackingMode]);

  const startGestureWatch = useCallback((exerciseId: string) => {
    // start the camera/pose pipeline in the gesture-detection state. the rep
    // counter and form analysis stay dormant until enterTrackingMode runs at
    // the end of the countdown.
    pendingExerciseIdRef.current = exerciseId;
    gestureFirstSeenAtRef.current = null;
    for (const t of countdownTimeoutsRef.current) clearTimeout(t);
    countdownTimeoutsRef.current = [];
    isTrackingRef.current = false;
    repCounterRef.current?.reset();
    repCounterRef.current = null;
    violationStartTimesRef.current.clear();
    setRepCount(null);
    setTargetReps(null);
    setCountdownSecondsLeft(null);
    setTrackingMode('waiting_for_gesture');
    setState((s) => ({
      ...s,
      isTracking: false,
      currentPose: null,
      currentFeedback: null,
      error: null,
    }));
  }, []);

  // handlePoseResult — takes a parsed pose from the frame processor.
  // - 'idle': bail out
  // - 'waiting_for_gesture': run the arms-overhead detector. don't analyze
  //   form, don't update the rep counter. update currentPose so the screen
  //   can still render the skeleton overlay (gives the user feedback that
  //   the camera sees them).
  // - 'countdown': pose-only update for the skeleton; everything else dormant.
  // - 'tracking': existing path — analyze, smooth, update rep counter.
  const handlePoseResult = useCallback(
    (pose: Pose | null) => {
      const mode = trackingModeRef.current;
      if (mode === 'idle') return;

      let feedback: FormFeedback | null = null;

      if (mode === 'waiting_for_gesture' && pose) {
        // sustained-detection: only fire when both wrists have been above both
        // shoulders for at least GESTURE_HOLD_MS. resets if any frame fails.
        if (detectArmsOverhead(pose)) {
          if (gestureFirstSeenAtRef.current === null) {
            gestureFirstSeenAtRef.current = Date.now();
          } else if (Date.now() - gestureFirstSeenAtRef.current >= GESTURE_HOLD_MS) {
            gestureFirstSeenAtRef.current = null;
            beginCountdown();
          }
        } else {
          gestureFirstSeenAtRef.current = null;
        }
      }

      if (mode === 'tracking' && pose && exerciseIdRef.current) {
        const raw = analyzePose(pose, exerciseIdRef.current, activeRulesRef.current ?? undefined);
        // apply 300ms smoothing: drop violations that haven't been continuously
        // failing for long enough yet, and clear timers for rules that have
        // recovered. recompute the binary score from the smoothed list so a
        // single-frame glitch doesn't tank the per-frame form score.
        const smoothed = smoothViolations(raw.violations, violationStartTimesRef.current, Date.now());
        feedback = {
          violations: smoothed,
          score: smoothed.length === 0 ? 100 : 0,
          isGoodForm: smoothed.length === 0,
        };

        // update rep counter
        if (repCounterRef.current) {
          const count = repCounterRef.current.update(pose);
          setRepCount(count);
          setDebugAngle(repCounterRef.current.lastAngle);
          setDebugPhase(repCounterRef.current.currentPhase);
          setDebugConfidences(repCounterRef.current.debugConfidences);
          setDebugPositions(repCounterRef.current.debugPositions);
        }
      }

      pendingPoseRef.current = pose;
      pendingFeedbackRef.current = feedback;

      const now = Date.now();
      if (now - lastStateUpdateRef.current >= STATE_UPDATE_INTERVAL) {
        lastStateUpdateRef.current = now;
        setState((s) => ({
          ...s,
          currentPose: pendingPoseRef.current,
          currentFeedback: pendingFeedbackRef.current,
        }));
      }
    },
    [beginCountdown]
  );

  // stop tracking when app goes to background
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState !== 'active' && isTrackingRef.current) {
        if (__DEV__) console.log('app backgrounded, stopping tracking');
        stopTracking();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [stopTracking]);

  return (
    <VisionContext.Provider
      value={{
        state,
        trackingMode,
        countdownSecondsLeft,
        repCount,
        targetReps,
        debugAngle,
        debugPhase,
        debugConfidences,
        debugPositions,
        setModelReady,
        startTracking,
        startGestureWatch,
        stopTracking,
        handlePoseResult,
        getRepHistory,
      }}
    >
      {children}
    </VisionContext.Provider>
  );
}

export function useVisionContext(): VisionContextValue {
  const context = useContext(VisionContext);
  if (!context) {
    throw new Error('useVisionContext must be used within VisionProvider');
  }
  return context;
}

// arms-overhead gesture detector. true when both wrists are confidently above
// both shoulders by at least 15% of the visible torso height. uses left hip
// as the torso anchor; if hip is missing or unconfident, falls back to a
// constant 0.2 normalized-y margin (the keypoint coords are normalized 0..1).
function detectArmsOverhead(pose: Pose): boolean {
  const ls = pose.keypoints.find((k) => k.name === 'left_shoulder');
  const rs = pose.keypoints.find((k) => k.name === 'right_shoulder');
  const lw = pose.keypoints.find((k) => k.name === 'left_wrist');
  const rw = pose.keypoints.find((k) => k.name === 'right_wrist');
  const lh = pose.keypoints.find((k) => k.name === 'left_hip');

  if (!ls || !rs || !lw || !rw) return false;
  if (!isConfident(ls) || !isConfident(rs) || !isConfident(lw) || !isConfident(rw)) {
    return false;
  }

  const torso = lh && isConfident(lh) ? Math.abs(ls.y - lh.y) : 0.2;
  const margin = torso * 0.15;

  // y axis: smaller y = higher on screen, so wrist above shoulder means wrist.y < shoulder.y
  return lw.y < ls.y - margin && rw.y < rs.y - margin;
}

// dedupes by message and applies the 300ms persistence window. mutates
// startTimes in place: prunes keys whose rule passed this frame, adds new
// entries for newly-failing rules, and only emits violations whose start
// time is at least VIOLATION_SMOOTHING_MS in the past.
function smoothViolations(
  raw: FormViolation[],
  startTimes: Map<string, number>,
  now: number,
): FormViolation[] {
  const currentKeys = new Set(raw.map((v) => v.message));

  // sweep: rules that passed this frame have their timer cleared
  for (const key of Array.from(startTimes.keys())) {
    if (!currentKeys.has(key)) startTimes.delete(key);
  }

  const out: FormViolation[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (seen.has(v.message)) continue;
    seen.add(v.message);

    let firstAt = startTimes.get(v.message);
    if (firstAt === undefined) {
      startTimes.set(v.message, now);
      firstAt = now;
    }
    if (now - firstAt >= VIOLATION_SMOOTHING_MS) {
      out.push(v);
    }
  }
  return out;
}
