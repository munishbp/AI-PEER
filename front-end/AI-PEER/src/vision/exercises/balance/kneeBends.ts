/**
 * Knee Bends
 * Balance exercise for leg strength and stability
 */

import { ExerciseRule } from '../types';

export const kneeBendsRules: ExerciseRule = {
  id: 'balance-1',
  name: 'Knee Bends',
  category: 'balance',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 90,
      max: 140,
      message: 'Bend your knees more',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 90,
      max: 140,
      message: 'Bend your knees more',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your back straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your hips level',
      severity: 'warning',
    },
  ],
};
