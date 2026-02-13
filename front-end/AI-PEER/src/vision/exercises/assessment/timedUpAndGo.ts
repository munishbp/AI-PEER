/**
 * Timed Up and Go (TUG)
 * Assessment for mobility and fall risk
 */

import { ExerciseRule } from '../types';

export const timedUpAndGoRules: ExerciseRule = {
  id: 'assessment-3',
  name: 'Timed Up and Go',
  category: 'assessment',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 25,
      message: 'Maintain upright posture while walking',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Keep your head up while walking',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep shoulders level during turns',
      severity: 'warning',
    },
  ],
};
