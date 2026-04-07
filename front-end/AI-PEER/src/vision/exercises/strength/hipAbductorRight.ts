/**
 * Hip Abductor (Right Side)
 * Strength exercise for hip muscles — right leg
 */

import { ExerciseRule } from '../types';

export const hipAbductorRightRules: ExerciseRule = {
  id: 'strength-3-right',
  name: 'Hip Abductor',
  category: 'strength',
  repConfig: {
    keypoints: ['right_shoulder', 'right_hip', 'right_knee'],
    startMin: 160, startMax: 180,
    endMin: 120, endMax: 155,
    targetReps: 10,
  },
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. Place your phone about 6-8 feet away. Lift your leg to the side toward the camera\'s view.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'right_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your torso upright',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your standing leg straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'left_shoulder'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep your shoulders level',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_hip', 'left_hip'],
      direction: 'horizontal',
      tolerance: 25,
      message: 'Try to keep your hips level',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'right_hip',
      relation: 'above',
      message: 'Keep your head up',
      severity: 'warning',
    },
  ],
};
