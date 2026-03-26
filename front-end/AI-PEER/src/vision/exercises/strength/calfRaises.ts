/**
 * Calf Raises
 * Strength exercise for calf muscles
 */

import { ExerciseRule } from '../types';

export const calfRaisesRules: ExerciseRule = {
  id: 'strength-4',
  name: 'Calf Raises',
  category: 'strength',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. About 6-8 feet away. Keep your legs straight.',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your knees straight',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your knees straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 10,
      message: 'Keep your body straight',
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
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 10,
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
  ],
};
