//
// frameProcessor.ts — bridge between camera frames and vision pipeline
//
// runs entirely on VisionCamera's worklet thread via useFrameProcessor:
// 1. resize camera frame to 640x640 rgb float32
// 2. run tflite inference via model.runSync
// 3. parse pose keypoints from raw output (parsePoseFromOutput is a worklet)
// 4. send parsed Pose object to JS thread via useRunOnJS
//
// important threading notes:
// - useRunOnJS must come from react-native-worklets-core (not react-native-worklets).
//   VisionCamera v4 decorates its frame processor runtime with worklets-core's
//   native globals. the newer react-native-worklets package has its own serialization
//   globals (_createSerializable) that are NOT installed on VisionCamera's runtime.
// - ArrayBuffers cannot cross the thread boundary as shared values.
//   pose parsing happens inside the worklet so only the plain Pose object
//   (numbers + strings) gets serialized to JS.
//
// frame data is never persisted — keypoints are extracted and the frame reference is dropped
//

import { useRef, useCallback } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue } from 'react-native-reanimated';
import { useRunOnJS } from 'react-native-worklets-core';
import { TensorflowModel } from 'react-native-fast-tflite';
import { parsePoseFromOutput } from './VisionService';
import { Pose } from './types';

type OnPoseDetected = (pose: Pose | null) => void;

// throttle to every 3rd frame (~10fps at 30fps camera)
const FRAME_SKIP = 3;

export function useVisionFrameProcessor(
  model: TensorflowModel | undefined,
  onPoseDetected: OnPoseDetected
) {
  const { resize } = useResizePlugin();
  const frameCount = useSharedValue(0);
  const onPoseRef = useRef(onPoseDetected);
  onPoseRef.current = onPoseDetected;

  // callback runs on JS thread — receives the already-parsed Pose from the worklet
  const handlePose = useCallback((pose: Pose | null) => {
    onPoseRef.current(pose);
  }, []);

  // useRunOnJS (worklets-core) wraps handlePose as a shareable function callable
  // from VisionCamera's frame processor runtime
  const handleOnJS = useRunOnJS(handlePose, [handlePose]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    // throttle — skip frames to keep things smooth
    frameCount.value = frameCount.value + 1;
    if (frameCount.value % FRAME_SKIP !== 0) return;

    if (model == null) return;

    const resized = resize(frame, {
      scale: { width: 640, height: 640 },
      pixelFormat: 'rgb',
      dataType: 'float32',
    });

    const outputs = model.runSync([resized]);
    const output = outputs[0];
    if (!output) return;

    // parse pose in the worklet — avoids passing ArrayBuffer across threads
    const floats = new Float32Array(output.buffer);
    const pose = parsePoseFromOutput(floats);
    handleOnJS(pose);
  }, [resize, model, handleOnJS]);

  return frameProcessor;
}
