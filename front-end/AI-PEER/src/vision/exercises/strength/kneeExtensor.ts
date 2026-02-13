/**
 * Knee Extensor
 * Strength exercise for quadriceps
 */

import { ExerciseRule } from '../types';

export const kneeExtensorRules: ExerciseRule = {
  id: 'strength-1',
  name: 'Knee Extensor',
  category: 'strength',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 150,
      max: 180,
      message: 'Extend your leg fully',
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
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your hips stable',
      severity: 'warning',
    },
  ],
};
