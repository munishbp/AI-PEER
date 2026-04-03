/**
 * Heel Toe Walk Backwards
 * Balance exercise for backwards tandem walking
 */

import { ExerciseRule } from '../types';

export const heelToeWalkBackwardsRules: ExerciseRule = {
  id: 'balance-11',
  name: 'Heel Toe Walk Backwards',
  category: 'balance',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Place your phone so the camera can see your full body. Walk heel-to-toe backwards across the camera\'s view.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 20,
      message: 'Keep your body upright',
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
      tolerance: 20,
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
