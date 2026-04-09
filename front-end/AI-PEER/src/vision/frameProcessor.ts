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
import {
  mapMediaPipeToPose,
  mapMediaPipeToHands,
  type MediaPipeLandmark,
  type Hand,
} from './VisionService';
import { Pose } from './types';

// The native plugin now returns BOTH pose AND hand landmarks per frame:
//   { pose: [33 landmark dicts], hands: [[21 landmark dicts], ...] }
// pose is required (returns null on detection failure); hands may be empty.
type OnPoseDetected = (pose: Pose | null, hands: Hand[]) => void;

// Initialize the native plugin once (module-level). The plugin name stays
// 'poseLandmarker' even though it now also returns hands — both iOS and
// Android plugin classes have been extended in-place.
const poseLandmarkerPlugin = VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker', {});

export function useVisionFrameProcessor(
  modelReady: boolean,
  onPoseDetected: OnPoseDetected
) {
  const onPoseRef = useRef(onPoseDetected);
  onPoseRef.current = onPoseDetected;

  // Process landmarks on JS thread: receive raw object, map both pose and
  // hands into our normalized coordinate space, forward to the consumer.
  const handleLandmarks = useCallback(
    (rawPose: MediaPipeLandmark[] | null, rawHands: any[]) => {
      if (!rawPose) {
        onPoseRef.current(null, []);
        return;
      }
      const pose = mapMediaPipeToPose(rawPose);
      const hands = mapMediaPipeToHands(rawHands);
      onPoseRef.current(pose, hands);
    },
    []
  );

  const handleOnJS = useRunOnJS(handleLandmarks, [handleLandmarks]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    if (!poseLandmarkerPlugin) return;

    const result = poseLandmarkerPlugin.call(frame);

    if (!result || typeof result !== 'object') {
      handleOnJS(null, []);
      return;
    }

    const pose = (result as any).pose;
    const hands = (result as any).hands;

    if (!Array.isArray(pose) || pose.length < 33) {
      handleOnJS(null, []);
      return;
    }

    handleOnJS(pose as MediaPipeLandmark[], Array.isArray(hands) ? hands : []);
  }, [handleOnJS]);

  return frameProcessor;
}
