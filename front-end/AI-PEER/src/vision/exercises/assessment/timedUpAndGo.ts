/**
 * Timed Up and Go (TUG)
 * Assessment for mobility and fall risk
 */

import { ExerciseRule } from '../types';

export const timedUpAndGoRules: ExerciseRule = {
  id: 'assessment-3',
  name: 'Timed Up and Go',
  category: 'assessment',
  cameraPrompt: 'Sit in a chair facing the camera. You will need 8-10 feet of clear floor space in front of the chair to walk to a marker, turn, and come back. Your full body must be visible. Place your phone about 8 feet away, propped at roughly chest height.',
  checks: [
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 30,
      message: 'Maintain upright posture while walking',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'nose',
      reference: 'left_hip',
      relation: 'above',
      message: 'Keep your head up while walking',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep shoulders level during turns',
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
