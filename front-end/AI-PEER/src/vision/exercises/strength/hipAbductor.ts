/**
 * Hip Abductor
 * Strength exercise for hip muscles
 */

import { ExerciseRule } from '../types';

export const hipAbductorRules: ExerciseRule = {
  id: 'strength-3',
  name: 'Hip Abductor',
  category: 'strength',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your torso upright',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your standing leg straight',
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
