/**
 * Heel Walking
 * Balance exercise walking on heels
 */

import { ExerciseRule } from '../types';

export const heelWalkingRules: ExerciseRule = {
  id: 'balance-9',
  name: 'Heel Walking',
  category: 'balance',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips level',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your legs relatively straight',
      severity: 'warning',
    },
  ],
};
