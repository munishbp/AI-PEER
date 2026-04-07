/**
 * config.ts - Vision module configuration
 *
 * Detection thresholds and performance settings for the MediaPipe
 * Pose Landmarker pipeline. The model itself is loaded natively
 * by the PoseLandmarkerPlugin (iOS: Swift, Android: Kotlin).
 */

export const VISION_CONFIG = {
  // Detection thresholds (used by skeleton rendering + rep counting)
  minKeyPointConfidence: 0.4,  // Ignore keypoints below 40% confidence
  minPoseConfidence: 0.3,      // Ignore pose if overall confidence < 30%

  // Performance
  targetFPS: 30,
};
