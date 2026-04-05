/**
 * Sideways Walk
 * Balance exercise for lateral stability
 */

import { ExerciseRule } from '../types';

export const sidewaysWalkRules: ExerciseRule = {
  id: 'balance-3',
  name: 'Sideways Walk',
  category: 'balance',
  timerSeconds: 30,
  totalSets: 3,
  cameraPrompt: 'Place your phone so the camera can see your full body. Walk sideways across the camera\'s view.',
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
      message: 'Keep your head up — look forward',
      severity: 'warning',
    },
  ],
};
