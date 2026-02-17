/**
 * Calf Raises
 * Strength exercise for calf muscles
 */

import { ExerciseRule } from '../types';

export const calfRaisesRules: ExerciseRule = {
  id: 'strength-4',
  name: 'Calf Raises',
  category: 'strength',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your knees straight',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your knees straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 10,
      message: 'Keep your body straight',
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
