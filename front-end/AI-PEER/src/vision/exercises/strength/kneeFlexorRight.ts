/**
 * Knee Flexor (Right Side)
 * Strength exercise for hamstrings — right leg
 */

import { ExerciseRule } from '../types';

export const kneeFlexorRightRules: ExerciseRule = {
  id: 'strength-2-right',
  name: 'Knee Flexor',
  category: 'strength',
  repConfig: {
    keypoints: ['right_hip', 'right_knee', 'right_ankle'],
    startMin: 160, startMax: 180,
    endMin: 50, endMax: 120,
    targetReps: 10,
  },
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Stand with your right side facing the camera. Your full body from head to ankles should be visible. Place your phone about 6-8 feet away.',
  checks: [
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 70,
      max: 130,
      message: 'Bend your knee more',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'right_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your upper body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'left_knee'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your standing leg straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'left_shoulder'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your shoulders level',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_hip', 'left_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips level',
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
