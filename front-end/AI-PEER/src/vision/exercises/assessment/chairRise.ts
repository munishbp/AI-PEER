/**
 * Chair Rise (30-Second Sit-to-Stand Test)
 * Assessment exercise for lower body strength
 */

import { ExerciseRule } from '../types';

export const chairRiseRules: ExerciseRule = {
  id: 'assessment-1',
  name: 'Chair Rise',
  category: 'assessment',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Stand up fully - straighten your legs',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 160,
      max: 180,
      message: 'Stand up fully - straighten your legs',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your back straight as you stand',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Keep your head up',
      severity: 'warning',
    },
  ],
};
