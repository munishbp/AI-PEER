/**
 * Ankle Movements
 * Warm-up exercise for ankle mobility
 */

import { ExerciseRule } from '../types';

export const ankleMovementsRules: ExerciseRule = {
  id: 'warmup-5',
  name: 'Ankle Movements',
  category: 'warmup',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your upper body stable',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your hips level for balance',
      severity: 'warning',
    },
  ],
};
