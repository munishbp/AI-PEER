//
// useVision.ts — simplified hook for vision interaction
//
// wraps the context and provides a clean api for components
//

import { useVisionContext } from './VisionContext';
import { Pose, FormFeedback } from './types';

export function useVision() {
  const {
    state,
    setModelReady,
    startTracking,
    stopTracking,
    handlePoseResult,
  } = useVisionContext();

  const isReady: boolean = state.isModelLoaded;
  const isTracking: boolean = state.isTracking;
  const currentPose: Pose | null = state.currentPose;
  const currentFeedback: FormFeedback | null = state.currentFeedback;
  const error: string | null = state.error;
  const score: number | null = currentFeedback?.score ?? null;
  const isGoodForm: boolean = currentFeedback?.isGoodForm ?? false;

  return {
    // state
    isReady,
    isTracking,
    currentPose,
    currentFeedback,
    error,
    score,
    isGoodForm,

    // actions
    setModelReady,
    startTracking,
    stopTracking,
    handlePoseResult,
  };
}
