/**
 * Heel Toe Walk (Tandem Walk)
 * Balance exercise for dynamic narrow-base walking
 */

import { ExerciseRule } from '../types';

export const heelToeWalkRules: ExerciseRule = {
  id: 'balance-8',
  name: 'Heel Toe Walk',
  category: 'balance',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Place your phone so the camera can see your full body. Walk heel-to-toe across the camera\'s view.',
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
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Look forward, not down',
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
  ],
};
