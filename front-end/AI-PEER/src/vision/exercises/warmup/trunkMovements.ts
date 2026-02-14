/**
 * Trunk Movements
 * Warm-up exercise for core and hip rotation
 */

import { ExerciseRule } from '../types';

export const trunkMovementsRules: ExerciseRule = {
  id: 'warmup-4',
  name: 'Trunk Movements',
  category: 'warmup',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Control the rotation from your core',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your legs stable',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your legs stable',
      severity: 'warning',
    },
  ],
};
