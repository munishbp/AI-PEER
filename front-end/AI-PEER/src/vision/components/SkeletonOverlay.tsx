/**
 * SkeletonOverlay.tsx
 *
 * Renders a pose skeleton (joints + bones) on top of the camera feed,
 * color-coded by form quality from the FormAnalyzer feedback.
 *
 * Re-renders at ~5 Hz so every operation inside the render path is memoised.
 */

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import {
  mapToScreen,
  getViolationMap,
  getBoneColor,
  getKeypointColor,
} from './skeletonUtils';

import { Pose, FormFeedback } from '@/src/vision/types';
import { skeleton_connections } from '@/src/vision/constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SkeletonOverlayProps = {
  pose: Pose;
  feedback: FormFeedback | null;
  width: number;
  height: number;
  isFrontCamera: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SkeletonOverlayInner: React.FC<SkeletonOverlayProps> = ({
  pose,
  feedback,
  width,
  height,
  isFrontCamera,
}) => {
  // Build a lookup of which body parts currently have violations
  const violationMap = useMemo(
    () => getViolationMap(feedback),
    [feedback],
  );

  // Project every keypoint into screen-space (or null if low confidence)
  const screenPoints = useMemo(
    () =>
      pose.keypoints.map((kp) =>
        mapToScreen(kp, width, height, isFrontCamera),
      ),
    [pose, width, height, isFrontCamera],
  );

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* ---- Bones ---- */}
      {skeleton_connections.map(([i, j]) => {
        const a = screenPoints[i];
        const b = screenPoints[j];
        if (a === null || b === null) return null;

        const nameA = pose.keypoints[i].name;
        const nameB = pose.keypoints[j].name;
        const color = getBoneColor(nameA, nameB, violationMap);

        return (
          <Line
            key={`bone-${i}-${j}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}

      {/* ---- Joints ---- */}
      {screenPoints.map((pt, idx) => {
        if (pt === null) return null;

        const color = getKeypointColor(pose.keypoints[idx].name, violationMap);

        return (
          <Circle
            key={`joint-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={5}
            fill={color}
          />
        );
      })}
    </Svg>
  );
};

// ---------------------------------------------------------------------------
// Memoised export — avoids re-renders when the same pose frame is passed
// ---------------------------------------------------------------------------

export const SkeletonOverlay = React.memo(
  SkeletonOverlayInner,
  (prev, next) =>
    prev.pose.timestamp === next.pose.timestamp &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.feedback === next.feedback,
);
