/**
 * Knee Flexor
 * Strength exercise for hamstrings
 */

import { ExerciseRule } from '../types';

export const kneeFlexorRules: ExerciseRule = {
  id: 'strength-2',
  name: 'Knee Flexor',
  category: 'strength',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 80,
      max: 120,
      message: 'Bend your knee more',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your upper body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_hip', 'right_knee'],
      direction: 'vertical',
      tolerance: 10,
      message: 'Keep your standing leg straight',
      severity: 'warning',
    },
  ],
};
