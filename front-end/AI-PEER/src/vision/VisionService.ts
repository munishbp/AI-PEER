//
// VisionService.ts — pose parsing utilities
//
// parsePoseFromOutput extracts the best-confidence pose from raw YOLO
// model output. Supports two formats:
//
// 1. Raw grid (nano, no NMS): 8400 × 56, column-major
// 2. Post-NMS (small/large):   300 × 57, row-major
//    each row: [x, y, w, h, confidence, class_id, kp0_x, kp0_y, kp0_conf, ...]
//    coordinates are normalized (0-1)
//

import { Platform } from 'react-native';
import { Pose, Keypoint } from './types';
import { keypoint_names } from './constants';

const SWAP_XY = Platform.OS === 'ios';

// Format 1: raw grid (nano without NMS)
const RAW_DETECTIONS = 8400;
const RAW_DATA_LENGTH = RAW_DETECTIONS * 56;

// Format 2: post-NMS (small/large)
const NMS_DETECTIONS = 300;
const NMS_STRIDE = 57; // values per detection
const NMS_DATA_LENGTH = NMS_DETECTIONS * NMS_STRIDE;

function parseRawGrid(data: Float32Array): Pose | null {
  'worklet';
  const numDet = RAW_DETECTIONS;

  let bestConfidence = 0;
  let bestIndex = -1;

  for (let i = 0; i < numDet; i++) {
    const confidence = data[4 * numDet + i];
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestIndex = i;
    }
  }

  if (bestIndex === -1 || bestConfidence < 0.3) return null;

  const keypoints: Keypoint[] = [];
  for (let k = 0; k < 17; k++) {
    const baseIndex = (5 + k * 3) * numDet + bestIndex;
    const rawX = data[baseIndex];
    const rawY = data[baseIndex + numDet];

    keypoints.push({
      name: keypoint_names[k],
      x: SWAP_XY ? rawY : rawX,
      y: SWAP_XY ? rawX : rawY,
      confidence: data[baseIndex + 2 * numDet],
    });
  }

  const average_confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / 17;
  return { keypoints, timestamp: Date.now(), confidence: average_confidence };
}

function parseNMS(data: Float32Array): Pose | null {
  'worklet';
  // row-major: each detection is 57 consecutive values
  // [x, y, w, h, confidence, class_id, kp0_x, kp0_y, kp0_conf, ...]
  // coordinates are normalized (0-1)

  let bestConfidence = 0;
  let bestOffset = -1;

  for (let i = 0; i < NMS_DETECTIONS; i++) {
    const offset = i * NMS_STRIDE;
    const confidence = data[offset + 4];
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestOffset = offset;
    }
  }

  if (bestOffset === -1 || bestConfidence < 0.3) return null;

  const keypoints: Keypoint[] = [];
  for (let k = 0; k < 17; k++) {
    const kpBase = bestOffset + 6 + k * 3; // keypoints start after bbox(4) + conf(1) + class(1)
    const rawX = data[kpBase];
    const rawY = data[kpBase + 1];

    keypoints.push({
      name: keypoint_names[k],
      x: SWAP_XY ? rawY : rawX,
      y: SWAP_XY ? rawX : rawY,
      confidence: data[kpBase + 2],
    });
  }

  const average_confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / 17;
  return { keypoints, timestamp: Date.now(), confidence: average_confidence };
}

export function parsePoseFromOutput(data: Float32Array): Pose | null {
  'worklet';
  if (!data || data.length === 0) return null;

  if (data.length >= RAW_DATA_LENGTH) {
    return parseRawGrid(data);
  } else if (data.length >= NMS_DATA_LENGTH) {
    return parseNMS(data);
  }

  if (__DEV__) console.warn('unknown model output size:', data.length);
  return null;
}

// ---------------------------------------------------------------------------
// MediaPipe Pose Landmarker parser
// ---------------------------------------------------------------------------

// Maps MediaPipe 33 landmark indices to COCO 17 keypoint names
const MEDIAPIPE_TO_COCO: Array<[number, string]> = [
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

type MediaPipeLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

/**
 * Convert MediaPipe Pose Landmarker output (33 landmarks) to our Pose format.
 * MediaPipe coordinates are already normalized 0-1.
 * No SWAP_XY needed — MediaPipe handles iOS frame orientation internally.
 */
export function mapMediaPipeToPose(landmarks: MediaPipeLandmark[]): Pose | null {
  if (!landmarks || landmarks.length < 33) return null;

  const keypoints: Keypoint[] = MEDIAPIPE_TO_COCO.map(([mpIndex, name]) => {
    const lm = landmarks[mpIndex];
    return {
      name,
      x: lm.x,
      y: lm.y,
      confidence: lm.visibility,
      z: lm.z,
      visibility: lm.visibility,
    };
  });

  const average_confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length;
  return { keypoints, timestamp: Date.now(), confidence: average_confidence };
}
