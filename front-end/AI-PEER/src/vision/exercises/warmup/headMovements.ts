/**
 * Head Movements
 * Warm-up exercise for neck mobility
 */

import { ExerciseRule } from '../types';

export const headMovementsRules: ExerciseRule = {
  id: 'warmup-1',
  name: 'Head Movements',
  category: 'warmup',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your shoulders still while moving your head',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your back straight',
      severity: 'warning',
    },
  ],
};
