/**
 * Chair Rise (30-Second Sit-to-Stand Test)
 * Assessment exercise for lower body strength
 */

import { ExerciseRule } from '../types';

export const chairRiseRules: ExerciseRule = {
  id: 'assessment-1',
  name: 'Chair Rise',
  category: 'assessment',
  repConfig: {
    mode: 'angle3d',
    keypoints: ['left_hip', 'left_knee', 'left_ankle'],
    startMin: 50, startMax: 125,
    endMin: 145, endMax: 180,
    targetReps: 30, // arbitrary high cap; the 30s timer drives the stop
  },
  cameraPrompt: 'Sit in a chair facing the camera with your arms crossed across your chest. Your full body, from head to feet, must be visible both when seated and when standing. Place your phone about 6-8 feet away, propped at roughly chest height while you are seated.',
  checks: [
    {
      type: 'position',
      keypoint: 'left_wrist',
      reference: 'left_shoulder',
      relation: 'right_of',
      message: 'Keep your arms crossed across your chest',
      severity: 'warning',
    },
    {
      type: 'position',
      keypoint: 'right_wrist',
      reference: 'right_shoulder',
      relation: 'left_of',
      message: 'Keep your arms crossed across your chest',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['left_hip', 'left_knee', 'left_ankle'],
      min: 150,
      max: 180,
      message: 'Stand up fully - straighten your legs',
      severity: 'warning',
    },
    {
      type: 'angle',
      keypoints: ['right_hip', 'right_knee', 'right_ankle'],
      min: 150,
      max: 180,
      message: 'Stand up fully - straighten your legs',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'left_hip'],
      direction: 'vertical',
      tolerance: 25,
      message: 'Keep your back straight as you stand',
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
    {
      type: 'alignment',
      keypoints: ['left_shoulder', 'right_shoulder'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep your shoulders level as you stand',
      severity: 'warning',
    },
    {
      type: 'alignment',
      keypoints: ['left_hip', 'right_hip'],
      direction: 'horizontal',
      tolerance: 20,
      message: 'Keep your hips level as you stand',
      severity: 'warning',
    },
  ],
};
