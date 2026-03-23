/**
 * Back Movements
 * Warm-up exercise for spine mobility
 */

import { ExerciseRule } from '../types';

export const backMovementsRules: ExerciseRule = {
  id: 'warmup-3',
  name: 'Back Movements',
  category: 'warmup',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. About 6-8 feet away.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips stable',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your legs straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 35,
      message: 'Control your back movement — avoid excessive bending',
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
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Keep your head up',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your legs straight',
      severity: 'warning',
    },
  ],
};
