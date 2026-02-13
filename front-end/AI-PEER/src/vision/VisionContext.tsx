//
// VisionContext.tsx — react context for vision state management
//
// singleton (VisionService) holds the tflite model, survives unmounts
// context (this file) provides react state that triggers re-renders
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
import VisionService from './VisionService';
import { analyzePose } from './FormAnalyzer';

type VisionContextValue = {
  state: VisionState;
  initializeModel: () => Promise<void>;
  startTracking: (exerciseId: string) => void;
  stopTracking: () => void;
  processFrame: (frameData: Float32Array, width: number, height: number) => void;
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

  // refs for stable callback identity — avoids processFrame changing every render
  const isTrackingRef = useRef(false);
  const exerciseIdRef = useRef<string | null>(null);
  const lastStateUpdateRef = useRef(0);
  const pendingPoseRef = useRef<Pose | null>(null);
  const pendingFeedbackRef = useRef<FormFeedback | null>(null);

  const initializeModel = useCallback(async () => {
    if (VisionService.isReady()) {
      setState((s) => ({ ...s, isModelLoaded: true }));
      return;
    }

    setState((s) => ({ ...s, error: null }));

    try {
      await VisionService.initialize();
      setState((s) => ({ ...s, isModelLoaded: true }));
    } catch (error) {
      console.error('vision model initialization failed:', error);
      setState((s) => ({
        ...s,
        error: `Failed to load vision model: ${error}`,
        isModelLoaded: false,
      }));
      throw error;
    }
  }, []);

  const startTracking = useCallback((exerciseId: string) => {
    if (!VisionService.isReady()) {
      if (__DEV__) console.warn('cannot start tracking: model not loaded');
      return;
    }

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

  // processFrame uses refs so its identity never changes
  const processFrame = useCallback(
    (frameData: Float32Array, width: number, height: number) => {
      if (!isTrackingRef.current || !VisionService.isReady()) return;

      const pose = VisionService.runInference(frameData, width, height);

      let feedback: FormFeedback | null = null;
      if (pose && exerciseIdRef.current) {
        feedback = analyzePose(pose, exerciseIdRef.current);
      }

      // store latest in refs
      pendingPoseRef.current = pose;
      pendingFeedbackRef.current = feedback;

      // throttle actual state updates
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
        initializeModel,
        startTracking,
        stopTracking,
        processFrame,
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
