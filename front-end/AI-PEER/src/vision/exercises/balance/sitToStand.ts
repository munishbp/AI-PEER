/**
 * Sit to Stand
 * Balance exercise for functional leg strength
 */

import { ExerciseRule } from '../types';

export const sitToStandRules: ExerciseRule = {
  id: 'balance-2',
  name: 'Sit to Stand',
  category: 'balance',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 25,
      message: 'Keep your back straight as you stand',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Stand up fully',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your shoulders level',
      severity: 'warning',
    },
  ],
};
