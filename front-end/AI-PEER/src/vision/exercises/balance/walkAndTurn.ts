/**
 * Walk and Turn
 * Balance exercise for turning stability
 */

import { ExerciseRule } from '../types';

export const walkAndTurnRules: ExerciseRule = {
  id: 'balance-5',
  name: 'Walk and Turn',
  category: 'balance',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Place your phone so the camera can see your full body. Walk and turn within the camera\'s view.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 25,
      message: 'Stay upright during turns',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 25,
      message: 'Keep your hips stable during turns',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 25,
      message: 'Keep your shoulders level during turns',
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
