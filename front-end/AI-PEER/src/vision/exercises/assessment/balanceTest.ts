/**
 * 4-Stage Balance Test
 * Assessment for static balance ability
 */

import { ExerciseRule } from '../types';

export const balanceTestRules: ExerciseRule = {
  id: 'assessment-2',
  name: '4-Stage Balance Test',
  category: 'assessment',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 10,
      message: 'Keep your body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'right_hip'],
      direction: 'vertical',
      tolerance: 10,
      message: 'Keep your body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your shoulders level',
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
