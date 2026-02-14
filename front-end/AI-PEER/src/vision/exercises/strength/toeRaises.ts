/**
 * Toe Raises
 * Strength exercise for shin muscles
 */

import { ExerciseRule } from '../types';

export const toeRaisesRules: ExerciseRule = {
  id: 'strength-5',
  name: 'Toe Raises',
  category: 'strength',
  checks: [
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
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 10,
      message: 'Maintain upright posture',
      severity: 'warning',
    },
  ],
};
