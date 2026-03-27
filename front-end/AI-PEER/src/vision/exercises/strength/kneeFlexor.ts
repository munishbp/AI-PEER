/**
 * Knee Flexor
 * Strength exercise for hamstrings
 */

import { ExerciseRule } from '../types';

export const kneeFlexorRules: ExerciseRule = {
  id: 'strength-2',
  name: 'Knee Flexor',
  category: 'strength',
  repConfig: {
    keypoints: ['left_hip', 'left_knee', 'left_ankle'],
    startMin: 150, startMax: 180,
    endMin: 50, endMax: 140,
    targetReps: 10,
  },
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Stand with your left side facing the camera. Your full body from head to ankles should be visible. Place your phone about 6-8 feet away.',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 70,
      max: 130,
      message: 'Bend your knee more',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your upper body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_hip', 'right_knee'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your standing leg straight',
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
      message: 'Keep your hips level',
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
