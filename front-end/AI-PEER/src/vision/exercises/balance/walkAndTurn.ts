/**
 * Walk and Turn
 * Balance exercise for turning stability
 */

import { ExerciseRule } from '../types';

export const walkAndTurnRules: ExerciseRule = {
  id: 'balance-5',
  name: 'Walk and Turn',
  category: 'balance',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Stay upright during turns',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep your hips stable during turns',
      severity: 'warning',
    },
  ],
};
