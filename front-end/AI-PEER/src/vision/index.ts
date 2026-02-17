/**
 * Vision Module - On-device pose estimation for AI-PEER
 *
 * This module provides real-time pose detection and exercise form analysis.
 * All processing happens locally - no data leaves the phone.
 *
 * Usage:
 *   1. Wrap your app with <VisionProvider>
 *   2. Use the useVision() hook in components
 *
 * Example:
 *   import { useVision } from '@/src/vision';
 *
 *   function ExerciseScreen() {
 *     const { isReady, currentPose, startTracking } = useVision();
 *     // ...
 *   }
 */

// Types
export type {
  Keypoint,
  Pose,
  FormViolation,
  FormFeedback,
  VisionState,
  VisionConfig,
} from './types';

// Provider (wrap app root)
export { VisionProvider, useVisionContext } from './VisionContext';

// Main hook (use in components)
export { useVision } from './useVision';

// Config
export { VISION_CONFIG, MODEL_FILENAME, MODEL_ASSET } from './config';

// Constants
export { keypoint_names, skeleton_connections } from './constants';

// Form analyzer (if needed directly)
export { analyzePose } from './FormAnalyzer';

// Pose parser (standalone, usable from worklet context)
export { parsePoseFromOutput } from './VisionService';

// Exercise registry
export { getExerciseRules, getAllExerciseIds, getExercisesByCategory } from './exercises';
