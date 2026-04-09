/**
 * Knee Extensor (Right Side)
 * Strength exercise for quadriceps — right leg
 */

import { ExerciseRule } from '../types';

export const kneeExtensorRightRules: ExerciseRule = {
  id: 'strength-1-right',
  name: 'Knee Extensor',
  category: 'strength',
  repConfig: {
    keypoints: ['right_hip', 'right_knee', 'right_ankle'],
    startMin: 50, startMax: 125,
    endMin: 145, endMax: 180,
    targetReps: 10,
  },
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Sit sideways in a chair so the camera sees your RIGHT side — your right shoulder should be the one closest to the camera, not your face. Your full body, from head to feet, must be visible in frame. Place your phone about 6-8 feet away.',
  checks: [
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 145,
      max: 180,
      message: 'Extend your leg fully',
      severity: 'warning',
      gateOnRepZones: true,
    },
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'right_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your back straight',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_hip', 'left_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips stable',
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
      type: 'position',
      keypoint: 'nose',
      reference: 'right_hip',
      relation: 'above',
      message: 'Keep your head up',
      severity: 'warning',
    },
  ],
};
