/**
 * Trunk Movements
 * Warm-up exercise for core and hip rotation
 */

import { ExerciseRule } from '../types';

export const trunkMovementsRules: ExerciseRule = {
  id: 'warmup-4',
  name: 'Trunk Movements',
  category: 'warmup',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. About 6-8 feet away.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 25,
      message: 'Control the rotation from your core',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 155,
      max: 180,
      message: 'Keep your legs stable',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 155,
      max: 180,
      message: 'Keep your legs stable',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 30,
      message: 'Keep your upper body upright while rotating',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 25,
      message: 'Keep your shoulders level during rotation',
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
