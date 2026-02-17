/**
 * Neck Movements
 * Warm-up exercise for neck rotation
 */

import { ExerciseRule } from '../types';

export const neckMovementsRules: ExerciseRule = {
  id: 'warmup-2',
  name: 'Neck Movements',
  category: 'warmup',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your shoulders level and still',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your hips still',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Maintain good posture',
      severity: 'warning',
    },
  ],
};
