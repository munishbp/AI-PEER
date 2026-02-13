//
// VisionService.ts — pose parsing utilities
//
// parsePoseFromOutput extracts the best-confidence pose from raw yolo26n
// model output (8400 detections x 56 values in column-major layout).
//
// marked as a worklet so it can run directly inside VisionCamera's frame
// processor — the babel worklet plugin captures NUM_DETECTIONS, keypoint_names,
// etc. into the worklet closure. this avoids sending the raw ArrayBuffer
// across the thread boundary (ArrayBuffers are not serializable as shared values).
//

import { Pose, Keypoint } from './types';
import { keypoint_names } from './constants';

const NUM_DETECTIONS = 8400;
const VALUES_PER_DETECTION = 56;
const MIN_DATA_LENGTH = NUM_DETECTIONS * VALUES_PER_DETECTION;

export function parsePoseFromOutput(data: Float32Array): Pose | null {
  'worklet';
  if (!data || data.length < MIN_DATA_LENGTH) {
    if (__DEV__) console.warn('invalid model output, expected', MIN_DATA_LENGTH, 'got', data?.length);
    return null;
  }

  let bestConfidence = 0;
  let bestIndex = -1;

  for (let i = 0; i < NUM_DETECTIONS; i++) {
    // confidence at index 4
    const confidence = data[4 * NUM_DETECTIONS + i];
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestIndex = i;
    }
  }

  // no good detection
  if (bestIndex === -1 || bestConfidence < 0.3) {
    return null;
  }

  // extract keypoints for best detection
  const keypoints: Keypoint[] = [];
  for (let k = 0; k < 17; k++) {
    // keypoints start at index 5, each has x,y,confidence
    const baseIndex = (5 + k * 3) * NUM_DETECTIONS + bestIndex;

    keypoints.push({
      name: keypoint_names[k],
      x: data[baseIndex],
      y: data[baseIndex + NUM_DETECTIONS],
      confidence: data[baseIndex + 2 * NUM_DETECTIONS],
    });
  }
  const average_confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / 17;

  return {
    keypoints,
    timestamp: Date.now(),
    confidence: average_confidence,
  };
}
