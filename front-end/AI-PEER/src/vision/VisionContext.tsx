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
import { VisionState, Pose, FormFeedback } from './types';
import { analyzePose } from './FormAnalyzer';

type VisionContextValue = {
  state: VisionState;
  setModelReady: (ready: boolean) => void;
  startTracking: (exerciseId: string) => void;
  stopTracking: () => void;
  // accepts an already-parsed pose from the frame processor worklet
  handlePoseResult: (pose: Pose | null) => void;
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

export function VisionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisionState>(initialState);

  // refs for stable callback identity
  const isTrackingRef = useRef(false);
  const exerciseIdRef = useRef<string | null>(null);
  const lastStateUpdateRef = useRef(0);
  const pendingPoseRef = useRef<Pose | null>(null);
  const pendingFeedbackRef = useRef<FormFeedback | null>(null);

  const setModelReady = useCallback((ready: boolean) => {
    setState((s) => ({ ...s, isModelLoaded: ready }));
  }, []);

  const startTracking = useCallback((exerciseId: string) => {
    exerciseIdRef.current = exerciseId;
    isTrackingRef.current = true;
    setState((s) => ({
      ...s,
      isTracking: true,
      currentPose: null,
      currentFeedback: null,
      error: null,
    }));
  }, []);

  const stopTracking = useCallback(() => {
    exerciseIdRef.current = null;
    isTrackingRef.current = false;
    setState((s) => ({
      ...s,
      isTracking: false,
      currentPose: null,
      currentFeedback: null,
    }));
  }, []);

  // handlePoseResult — takes a parsed pose from the frame processor
  // runs form analysis and throttles state updates
  const handlePoseResult = useCallback(
    (pose: Pose | null) => {
      if (!isTrackingRef.current) return;

      let feedback: FormFeedback | null = null;
      if (pose && exerciseIdRef.current) {
        feedback = analyzePose(pose, exerciseIdRef.current);
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
    []
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
        setModelReady,
        startTracking,
        stopTracking,
        handlePoseResult,
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
