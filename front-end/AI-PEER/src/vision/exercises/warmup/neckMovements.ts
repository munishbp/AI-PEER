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
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Keep your head above hip level',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_eye', 'right_eye'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Try to keep your head level — avoid excessive tilting',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_shoulder',
      relation: 'above',
      message: 'Do not drop your head below shoulder level',
      severity: 'warning',
    },
  ],
};
