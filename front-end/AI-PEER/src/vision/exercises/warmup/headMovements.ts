/**
 * Head Movements
 * Warm-up exercise for neck mobility
 */

import { ExerciseRule } from '../types';

export const headMovementsRules: ExerciseRule = {
  id: 'warmup-1',
  name: 'Head Movements',
  category: 'warmup',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera. Make sure your head and shoulders are clearly visible.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 10,
      message: 'Keep your shoulders still while moving your head',
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
      message: 'Keep your hips still while moving your head',
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
