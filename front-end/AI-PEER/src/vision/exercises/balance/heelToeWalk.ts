/**
 * Heel Toe Walk (Tandem Walk)
 * Balance exercise for dynamic narrow-base walking
 */

import { ExerciseRule } from '../types';

export const heelToeWalkRules: ExerciseRule = {
  id: 'balance-8',
  name: 'Heel Toe Walk',
  category: 'balance',
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
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 15,
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
  ],
};
