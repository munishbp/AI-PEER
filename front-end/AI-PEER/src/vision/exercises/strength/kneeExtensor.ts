/**
 * Knee Extensor
 * Strength exercise for quadriceps
 */

import { ExerciseRule } from '../types';

export const kneeExtensorRules: ExerciseRule = {
  id: 'strength-1',
  name: 'Knee Extensor',
  category: 'strength',
  repConfig: {
    keypoints: ['left_hip', 'left_knee', 'left_ankle'],
    startMin: 50, startMax: 130,
    endMin: 135, endMax: 180,
    targetReps: 10,
  },
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Sit in a chair facing the camera. Make sure your full legs — hips, knees, and ankles — are visible. Place your phone about 6 feet away at knee height.',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 140,
      max: 180,
      message: 'Extend your leg fully',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your back straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips stable',
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
  ],
};
