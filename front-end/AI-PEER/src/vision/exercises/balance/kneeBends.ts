/**
 * Knee Bends
 * Balance exercise for leg strength and stability
 */

import { ExerciseRule } from '../types';

export const kneeBendsRules: ExerciseRule = {
  id: 'balance-1',
  name: 'Knee Bends',
  category: 'balance',
  repConfig: {
    keypoints: ['left_hip', 'left_knee', 'left_ankle'],
    secondaryKeypoints: ['right_hip', 'right_knee', 'right_ankle'],
    startMin: 165, startMax: 180,
    endMin: 90, endMax: 120,
    targetReps: 10,
  },
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. Place your phone about 6-8 feet away. Bend your knees slowly and stand back up.',
  checks: [
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 80,
      max: 120,
      message: 'Bend your knees more',
      severity: 'warning',
      gateOnRepZones: true,
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 80,
      max: 120,
      message: 'Bend your knees more',
      severity: 'warning',
      gateOnRepZones: true,
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 25,
      message: 'Keep your back straight',
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
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 20,
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
