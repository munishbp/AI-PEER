/**
 * Hip Abductor
 * Strength exercise for hip muscles
 */

import { ExerciseRule } from '../types';

export const hipAbductorRules: ExerciseRule = {
  id: 'strength-3',
  name: 'Hip Abductor',
  category: 'strength',
  repConfig: {
    keypoints: ['left_shoulder', 'left_hip', 'left_ankle'],
    startMin: 156, startMax: 180,
    endMin: 110, endMax: 155,
    targetReps: 10,
  },
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. Place your phone about 6-8 feet away. Lift your leg to the side toward the camera\'s view.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your torso upright',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your standing leg straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep your shoulders level',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 25,
      message: 'Try to keep your hips level',
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
