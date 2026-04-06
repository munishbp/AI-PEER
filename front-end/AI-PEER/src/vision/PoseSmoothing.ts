//
// PoseSmoothing.ts — temporal smoothing for pose keypoints
//
// Applies EMA (exponential moving average) to keypoint x,y positions
// to reduce jitter. Also carries forward recent keypoints when a
// keypoint drops below confidence for a few frames (flicker suppression).
//
// Designed for geriatric users where dark clothing and slower movements
// cause intermittent low-confidence keypoints.
//

import { Pose, Keypoint } from './types';

// smoothing factor: 0 = full smooth (ignores new data), 1 = no smooth (raw data)
// 0.6 = more responsive than before, still kills worst jitter
const EMA_ALPHA = 0.6;

// carry forward a lost keypoint for up to 3 frames before giving up
const MAX_CARRY_FRAMES = 3;

// below this confidence, don't even attempt to carry forward
const MIN_CARRY_CONFIDENCE = 0.15;

// keypoints at or above this confidence are considered "good" for smoothing
const GOOD_CONFIDENCE = 0.4;

export class PoseSmoothing {
  private prevKeypoints: Map<string, Keypoint> = new Map();
  private dropCount: Map<string, number> = new Map();

  smooth(pose: Pose): Pose {
    const smoothed: Keypoint[] = [];

    for (const kp of pose.keypoints) {
      const prev = this.prevKeypoints.get(kp.name);

      if (kp.confidence >= GOOD_CONFIDENCE) {
        // Good keypoint: apply EMA smoothing
        if (prev && prev.confidence >= GOOD_CONFIDENCE) {
          smoothed.push({
            name: kp.name,
            x: EMA_ALPHA * kp.x + (1 - EMA_ALPHA) * prev.x,
            y: EMA_ALPHA * kp.y + (1 - EMA_ALPHA) * prev.y,
            confidence: kp.confidence,
          });
        } else {
          // No previous good keypoint, use raw
          smoothed.push({ ...kp });
        }
        this.dropCount.set(kp.name, 0);
      } else if (prev && prev.confidence >= GOOD_CONFIDENCE) {
        // Keypoint dropped below threshold: carry forward previous position
        const drops = (this.dropCount.get(kp.name) ?? 0) + 1;
        this.dropCount.set(kp.name, drops);

        if (drops <= MAX_CARRY_FRAMES && kp.confidence >= MIN_CARRY_CONFIDENCE) {
          smoothed.push({
            name: kp.name,
            x: prev.x,
            y: prev.y,
            confidence: prev.confidence * 0.8, // decay each carried frame
          });
        } else {
          // Too many drops or too low confidence
          smoothed.push({ ...kp });
        }
      } else {
        // No previous and current is bad — pass through
        smoothed.push({ ...kp });
        this.dropCount.set(kp.name, 0);
      }
    }

    // Update previous keypoints from smoothed output
    for (const kp of smoothed) {
      this.prevKeypoints.set(kp.name, kp);
    }

    return {
      keypoints: smoothed,
      timestamp: pose.timestamp,
      confidence: pose.confidence,
    };
  }

  reset() {
    this.prevKeypoints.clear();
    this.dropCount.clear();
  }
}
