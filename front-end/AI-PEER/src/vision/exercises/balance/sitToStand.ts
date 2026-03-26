/**
 * Sit to Stand
 * Balance exercise for functional leg strength
 */

import { ExerciseRule } from '../types';

export const sitToStandRules: ExerciseRule = {
  id: 'balance-2',
  name: 'Sit to Stand',
  category: 'balance',
  repConfig: {
    keypoints: ['left_hip', 'left_knee', 'left_ankle'],
    startMin: 60, startMax: 115,
    endMin: 155, endMax: 180,
    targetReps: 10,
  },
  totalSets: 3,
  cameraPrompt: 'Sit in a chair facing the camera. Make sure your full body — head to ankles — is visible when both seated and standing. Place your phone about 6-8 feet away.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 25,
      message: 'Keep your back straight as you stand',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Stand up fully',
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
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips level as you stand',
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
