/**
 * Ankle Movements
 * Warm-up exercise for ankle mobility
 */

import { ExerciseRule } from '../types';

export const ankleMovementsRules: ExerciseRule = {
  id: 'warmup-5',
  name: 'Ankle Movements',
  category: 'warmup',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. About 6-8 feet away.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your upper body stable',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips level for balance',
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
      min: 155,
      max: 180,
      message: 'Keep your supporting leg straight',
      severity: 'warning',
    },
  ],
};
