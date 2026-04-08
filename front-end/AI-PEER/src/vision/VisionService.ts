//
// VisionService.ts — MediaPipe Pose Landmarker parser
//
// Converts MediaPipe's 33 landmark output to our 17-keypoint COCO-compatible
// Pose format. Handles the iOS coordinate transform (landscape → portrait)
// and left/right label correction for the front camera mirror.
//

import { Platform } from 'react-native';
import { Pose, Keypoint } from './types';

// Maps MediaPipe 33 landmark indices to COCO 17 keypoint names.
//
// iOS: front camera image is pre-mirrored at capture, so MediaPipe's
// "left_*" landmarks visually appear on the user's right side. The labels
// must be swapped here so COCO right_wrist tracks the user's actual right
// wrist, etc.
//
// Android: CameraX delivers the front camera buffer WITHOUT pre-mirroring,
// so MediaPipe's labels already match the user's body directly. We use a
// separate non-swapped table on Android. Choose at runtime via Platform.OS.
const MEDIAPIPE_TO_COCO_IOS: Array<[number, string]> = [
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

const MEDIAPIPE_TO_COCO_ANDROID: Array<[number, string]> = [
  [0,  'nose'],
  [2,  'left_eye'],
  [5,  'right_eye'],
  [7,  'left_ear'],
  [8,  'right_ear'],
  [11, 'left_shoulder'],
  [12, 'right_shoulder'],
  [13, 'left_elbow'],
  [14, 'right_elbow'],
  [15, 'left_wrist'],
  [16, 'right_wrist'],
  [23, 'left_hip'],
  [24, 'right_hip'],
  [25, 'left_knee'],
  [26, 'right_knee'],
  [27, 'left_ankle'],
  [28, 'right_ankle'],
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
 * MediaPipe coordinates are normalized 0-1 in the raw camera-sensor frame space.
 *
 * iOS:     front camera buffer arrives in landscape-right and is pre-mirrored
 *          by the OS; transpose (x: lm.y, y: lm.x) maps landscape → portrait
 *          with head at top, and the iOS label table swaps L/R to compensate
 *          for the mirror so COCO right_wrist tracks the user's actual right.
 *          iOS path is byte-identical to the original implementation.
 * Android: CameraX delivers the front camera buffer in the opposite vertical
 *          orientation, so we flip the resulting Y (y: 1 - lm.x). Since the
 *          Android buffer is NOT pre-mirrored, MediaPipe's L/R labels already
 *          match the user's body, so we use the natural (non-swapped) Android
 *          label table. Empirically confirmed on Pixel 7 / Tensor G2.
 */
export function mapMediaPipeToPose(landmarks: MediaPipeLandmark[]): Pose | null {
  if (!landmarks || landmarks.length < 33) return null;

  const isAndroid = Platform.OS === 'android';
  const labelTable = isAndroid ? MEDIAPIPE_TO_COCO_ANDROID : MEDIAPIPE_TO_COCO_IOS;

  const keypoints: Keypoint[] = labelTable.map(([mpIndex, name]) => {
    const lm = landmarks[mpIndex];
    return {
      name,
      x: lm.y,
      y: isAndroid ? 1 - lm.x : lm.x,
      confidence: lm.visibility ?? 0.5,
      z: lm.z,
      visibility: lm.visibility ?? 0.5,
    };
  });

  const average_confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length;
  return { keypoints, timestamp: Date.now(), confidence: average_confidence };
}
