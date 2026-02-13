/**
 * Back Movements
 * Warm-up exercise for spine mobility
 */

import { ExerciseRule } from '../types';

export const backMovementsRules: ExerciseRule = {
  id: 'warmup-3',
  name: 'Back Movements',
  category: 'warmup',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips stable',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your legs straight',
      severity: 'warning',
    },
  ],
};
