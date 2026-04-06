//
// VisionService.ts — MediaPipe Pose Landmarker parser
//
// Converts MediaPipe's 33 landmark output to our 17-keypoint COCO-compatible
// Pose format. Handles the iOS coordinate transform (landscape → portrait)
// and left/right label correction for the front camera mirror.
//

import { Pose, Keypoint } from './types';

// Maps MediaPipe 33 landmark indices to COCO 17 keypoint names.
// Left/right labels are swapped because the coordinate transform
// (x: lm.y, y: lm.x) mirrors the body on the iOS front camera.
// MediaPipe's "left" landmarks appear on the user's right side on screen.
const MEDIAPIPE_TO_COCO: Array<[number, string]> = [
  [0,  'nose'],
  [2,  'right_eye'],
  [5,  'left_eye'],
  [7,  'right_ear'],
  [8,  'left_ear'],
  [11, 'right_shoulder'],
  [12, 'left_shoulder'],
  [13, 'right_elbow'],
  [14, 'left_elbow'],
  [15, 'right_wrist'],
  [16, 'left_wrist'],
  [23, 'right_hip'],
  [24, 'left_hip'],
  [25, 'right_knee'],
  [26, 'left_knee'],
  [27, 'right_ankle'],
  [28, 'left_ankle'],
];

export type MediaPipeLandmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
};

/**
 * Convert MediaPipe Pose Landmarker output (33 landmarks) to our Pose format.
 * MediaPipe coordinates are normalized 0-1 in the raw iOS landscape frame space.
 * We rotate 90° CW (x: lm.y, y: lm.x) to map landscape → portrait.
 */
export function mapMediaPipeToPose(landmarks: MediaPipeLandmark[]): Pose | null {
  if (!landmarks || landmarks.length < 33) return null;

  const keypoints: Keypoint[] = MEDIAPIPE_TO_COCO.map(([mpIndex, name]) => {
    const lm = landmarks[mpIndex];
    return {
      name,
      x: lm.y,
      y: lm.x,
      confidence: lm.visibility ?? 0.5,
      z: lm.z,
      visibility: lm.visibility ?? 0.5,
    };
  });

  const average_confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length;
  return { keypoints, timestamp: Date.now(), confidence: average_confidence };
}
