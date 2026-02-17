/**
 * Toe Walking
 * Balance exercise walking on toes
 */

import { ExerciseRule } from '../types';

export const toeWalkingRules: ExerciseRule = {
  id: 'balance-10',
  name: 'Toe Walking',
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
      min: 165,
      max: 180,
      message: 'Keep your legs straight',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your legs straight',
      severity: 'warning',
    },
  ],
};
