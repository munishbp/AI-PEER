/**
 * One Leg Stand
 * Balance exercise for single-leg stability
 */

import { ExerciseRule } from '../types';

export const oneLegStandRules: ExerciseRule = {
  id: 'balance-6',
  name: 'One Leg Stand',
  category: 'balance',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. About 6-8 feet away.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 15,
      message: 'Keep your body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 15,
      message: 'Keep your hips level',
      severity: 'error',
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
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 165,
      max: 180,
      message: 'Keep your standing leg straight',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Keep your head up — look forward',
      severity: 'warning',
    },
  ],
};
