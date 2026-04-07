/**
 * One Leg Stand (Right Side)
 * Balance exercise for single-leg stability — standing on left leg
 */

import { ExerciseRule } from '../types';

export const oneLegStandRightRules: ExerciseRule = {
  id: 'balance-6-right',
  name: 'One Leg Stand',
  category: 'balance',
  timerSeconds: 30,
  totalSets: 3,
  unilateral: true,
  cameraPrompt: 'Stand facing the camera with your full body visible — head to feet. About 6-8 feet away.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['right_shoulder', 'right_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your body upright',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['right_hip', 'left_hip'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep your hips level',
      severity: 'error',
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
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 160,
      max: 180,
      message: 'Keep your standing leg straight',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'right_hip',
      relation: 'above',
      message: 'Keep your head up — look forward',
      severity: 'warning',
    },
  ],
};
