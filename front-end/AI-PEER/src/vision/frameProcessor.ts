//
// frameProcessor.ts — bridge between camera frames and vision pipeline
//
// Uses a custom VisionCamera frame processor plugin that wraps
// Google's MediaPipe Pose Landmarker (native Swift on iOS).
// The plugin runs synchronously per frame and returns 33 landmarks.
//

import { useCallback, useRef } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { VisionCameraProxy } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { mapMediaPipeToPose, type MediaPipeLandmark } from './VisionService';
import { Pose } from './types';

type OnPoseDetected = (pose: Pose | null, repCount: number | null) => void;

// Initialize the native plugin once (module-level)
const poseLandmarkerPlugin = VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker', {});

export function useVisionFrameProcessor(
  modelReady: boolean,
  onPoseDetected: OnPoseDetected
) {
  const onPoseRef = useRef(onPoseDetected);
  onPoseRef.current = onPoseDetected;

  // Process landmarks on JS thread: receive raw array, map to Pose, forward
  const handleLandmarks = useCallback((landmarks: MediaPipeLandmark[] | null) => {
    if (!landmarks) {
      onPoseRef.current(null, null);
      return;
    }
    const pose = mapMediaPipeToPose(landmarks);
    onPoseRef.current(pose, null);
  }, []);

  const handleOnJS = useRunOnJS(handleLandmarks, [handleLandmarks]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    if (!poseLandmarkerPlugin) return;

    const result = poseLandmarkerPlugin.call(frame);

    if (!result || !Array.isArray(result) || result.length < 33) {
      handleOnJS(null);
      return;
    }

    handleOnJS(result as unknown as MediaPipeLandmark[]);
  }, [handleOnJS]);

  return frameProcessor;
}
