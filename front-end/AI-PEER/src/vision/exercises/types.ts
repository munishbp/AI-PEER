/**
 * types.ts - Type definitions for exercise rules
 *
 * These types define how exercise form checks are structured.
 */

/** A check that verifies an angle between 3 body points */
export type AngleCheck = {
  type: 'angle';
  /** Three keypoint names that form the angle (vertex is middle point) */
  keypoints: [string, string, string];
  /** Minimum acceptable angle in degrees */
  min: number;
  /** Maximum acceptable angle in degrees */
  max: number;
  /** Feedback message when angle is out of range */
  message: string;
  /** Severity of violation */
  severity: 'warning' | 'error';
};

/** A check that verifies two body parts are aligned (vertical or horizontal) */
export type AlignmentCheck = {
  type: 'alignment';
  /** Two keypoint names to check alignment between */
  keypoints: [string, string];
  /** 'vertical' = stacked top-to-bottom, 'horizontal' = side-by-side level */
  direction: 'vertical' | 'horizontal';
  /** Degrees off-axis allowed before violation */
  tolerance: number;
  /** Feedback message when misaligned */
  message: string;
  /** Severity of violation */
  severity: 'warning' | 'error';
};

/** A check that verifies a keypoint is above/below another */
export type PositionCheck = {
  type: 'position';
  /** The keypoint to check */
  keypoint: string;
  /** Reference keypoint to compare against */
  reference: string;
  /** Required relationship */
  relation: 'above' | 'below' | 'left_of' | 'right_of';
  /** Feedback message when position is wrong */
  message: string;
  /** Severity of violation */
  severity: 'warning' | 'error';
};

/** A check that verifies distance/spread between two points */
export type DistanceCheck = {
  type: 'distance';
  /** Two keypoint names to measure distance between */
  keypoints: [string, string];
  /** Reference keypoints for relative distance (e.g., shoulder width) */
  referenceKeypoints: [string, string];
  /** Minimum ratio of distance to reference */
  minRatio: number;
  /** Maximum ratio of distance to reference */
  maxRatio: number;
  /** Feedback message when distance is wrong */
  message: string;
  /** Severity of violation */
  severity: 'warning' | 'error';
};

/** Union of all check types */
export type FormCheck = AngleCheck | AlignmentCheck | PositionCheck | DistanceCheck;

/** Complete rule set for an exercise */
export type ExerciseRule = {
  /** Unique identifier (e.g., 'balance-1') */
  id: string;
  /** Display name (e.g., 'Knee Bends') */
  name: string;
  /** Category for grouping */
  category: 'assessment' | 'warmup' | 'strength' | 'balance';
  /** List of form checks to perform */
  checks: FormCheck[];
  /** Minimum confidence to trust keypoints for this exercise */
  minConfidence?: number;
};
