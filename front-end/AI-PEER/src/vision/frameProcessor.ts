//
// frameProcessor.ts — bridge between camera frames and vision pipeline
//
// uses vision-camera frame processor api to:
// 1. resize camera frame to 640x640 rgb float32
// 2. run tflite inference on the worklet thread
// 3. parse pose from output
// 4. post result back to js thread
//
// frame data is never persisted — keypoints are extracted and the frame reference is dropped
//

import { useRef, useCallback } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import VisionService from './VisionService';
import { parsePoseFromOutput } from './VisionService';
import { Pose } from './types';

type OnPoseDetected = (pose: Pose | null) => void;

// throttle to every 3rd frame (~10fps at 30fps camera)
const FRAME_SKIP = 3;

export function useVisionFrameProcessor(onPoseDetected: OnPoseDetected) {
  const { resize } = useResizePlugin();
  const frameCount = useSharedValue(0);
  const onPoseRef = useRef(onPoseDetected);
  onPoseRef.current = onPoseDetected;

  // bridge to post pose back to js thread
  const handlePose = useCallback((pose: Pose | null) => {
    onPoseRef.current(pose);
  }, []);

  const handlePoseJS = runOnJS(handlePose);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    // throttle — skip frames to keep things smooth
    frameCount.value = frameCount.value + 1;
    if (frameCount.value % FRAME_SKIP !== 0) return;

    // resize frame to 640x640 rgb float32 for yolo input
    const resized = resize(frame, {
      scale: { width: 640, height: 640 },
      pixelFormat: 'rgb',
      dataType: 'float32',
    });

    // get the interpreter and run inference on worklet thread
    const interpreter = VisionService.getInterpreter();
    if (!interpreter) return;

    const outputs = interpreter.runSync([resized]);
    const output = outputs[0];
    if (!output) return;

    // runSync returns TypedArray[] directly
    const data = output instanceof Float32Array
      ? output
      : new Float32Array(output as ArrayLike<number>);

    // parse pose from raw tensor output
    const pose = parsePoseFromOutput(data);

    // send back to js thread
    handlePoseJS(pose);
  }, [resize, handlePoseJS]);

  return frameProcessor;
}
