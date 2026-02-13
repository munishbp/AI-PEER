/**
 * config.ts - Vision module configuration
 *
 * Centralized config for model settings, detection thresholds,
 * and performance tuning.
 */

import { VisionConfig } from './types';

export const VISION_CONFIG: VisionConfig = {
  // Model settings
  modelURL: '',  // Not used - model is bundled locally
  modelFileName: 'yolo26n_float16.tflite',
  modelSizeBytes: 5.2 * 1024 * 1024,  // 5.2MB

  // Detection thresholds
  minKeyPointConfidence: 0.5,  // Ignore keypoints below 50% confidence
  minPoseConfidence: 0.3,      // Ignore pose if overall confidence < 30%

  // Performance
  targetFPS: 30,
  inputSize: 640,  // YOLO expects 640x640 input
};

// Convenience exports
export const MODEL_FILENAME = VISION_CONFIG.modelFileName;
export const MODEL_SIZE_BYTES = VISION_CONFIG.modelSizeBytes;

// Reference to the bundled model asset
export const MODEL_ASSET = require('./models/yolo26n_float16.tflite'); 
