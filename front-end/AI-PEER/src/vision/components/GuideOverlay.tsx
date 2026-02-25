/**
 * GuideOverlay.tsx
 *
 * Renders rule-based guide annotations (angle arcs, alignment lines,
 * position arrows) showing WHERE form needs correction.
 *
 * Renders behind the tracked skeleton so its blue hints don't obscure
 * the green/yellow/red feedback.
 */

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Line as SvgLine } from 'react-native-svg';

import {
  mapToScreen,
  describeArc,
  findKeypointByName,
  COLORS,
} from './skeletonUtils';

import { Pose } from '@/src/vision/types';
import { getExerciseRules } from '@/src/vision/exercises';
import type {
  AngleCheck,
  AlignmentCheck,
  PositionCheck,
  FormCheck,
} from '@/src/vision/exercises/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type GuideOverlayProps = {
  pose: Pose;
  exerciseId: string;
  width: number;
  height: number;
  isFrontCamera: boolean;
};

// ---------------------------------------------------------------------------
// Arrow path builders
// ---------------------------------------------------------------------------

const ARROW_SIZE = 10;

function arrowUp(x: number, y: number): string {
  const top = y - ARROW_SIZE;
  return `M ${x} ${top} L ${x - ARROW_SIZE / 2} ${y} L ${x + ARROW_SIZE / 2} ${y} Z`;
}

function arrowDown(x: number, y: number): string {
  const bottom = y + ARROW_SIZE;
  return `M ${x} ${bottom} L ${x - ARROW_SIZE / 2} ${y} L ${x + ARROW_SIZE / 2} ${y} Z`;
}

function arrowLeft(x: number, y: number): string {
  const left = x - ARROW_SIZE;
  return `M ${left} ${y} L ${x} ${y - ARROW_SIZE / 2} L ${x} ${y + ARROW_SIZE / 2} Z`;
}

function arrowRight(x: number, y: number): string {
  const right = x + ARROW_SIZE;
  return `M ${right} ${y} L ${x} ${y - ARROW_SIZE / 2} L ${x} ${y + ARROW_SIZE / 2} Z`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GuideOverlayInner: React.FC<GuideOverlayProps> = ({
  pose,
  exerciseId,
  width,
  height,
  isFrontCamera,
}) => {
  // Exercise rules don't change mid-session
  const rules = useMemo(() => getExerciseRules(exerciseId), [exerciseId]);

  if (!rules) return null;

  const elements: React.ReactNode[] = [];

  for (let ci = 0; ci < rules.checks.length; ci++) {
    const check: FormCheck = rules.checks[ci];

    // ---- AngleCheck: arc at the vertex (knee) ----
    if (check.type === 'angle') {
      const ac = check as AngleCheck;
      const kp0 = findKeypointByName(pose.keypoints, ac.keypoints[0]);
      const kp1 = findKeypointByName(pose.keypoints, ac.keypoints[1]); // vertex
      const kp2 = findKeypointByName(pose.keypoints, ac.keypoints[2]);
      if (!kp0 || !kp1 || !kp2) continue;

      const s0 = mapToScreen(kp0, width, height, isFrontCamera);
      const s1 = mapToScreen(kp1, width, height, isFrontCamera); // vertex
      const s2 = mapToScreen(kp2, width, height, isFrontCamera);
      if (!s0 || !s1 || !s2) continue;

      // Angle of each bone relative to the vertex
      const angle1 =
        Math.atan2(s0.y - s1.y, s0.x - s1.x) * (180 / Math.PI);
      const angle2 =
        Math.atan2(s2.y - s1.y, s2.x - s1.x) * (180 / Math.PI);

      const arcPath = describeArc(s1.x, s1.y, 20, angle1, angle2);

      elements.push(
        <Path
          key={`angle-${ci}`}
          d={arcPath}
          fill="none"
          stroke={COLORS.guide}
          strokeWidth={2}
        />,
      );
    }

    // ---- AlignmentCheck: dashed reference line ----
    if (check.type === 'alignment') {
      const al = check as AlignmentCheck;
      const kpA = findKeypointByName(pose.keypoints, al.keypoints[0]);
      const kpB = findKeypointByName(pose.keypoints, al.keypoints[1]);
      if (!kpA || !kpB) continue;

      const sA = mapToScreen(kpA, width, height, isFrontCamera);
      const sB = mapToScreen(kpB, width, height, isFrontCamera);
      if (!sA || !sB) continue;

      let x1: number, y1: number, x2: number, y2: number;
      const EXTEND = 20;

      if (al.direction === 'vertical') {
        // Vertical guide: straight line at average x, extended beyond the points
        const avgX = (sA.x + sB.x) / 2;
        const minY = Math.min(sA.y, sB.y);
        const maxY = Math.max(sA.y, sB.y);
        x1 = avgX;
        y1 = minY - EXTEND;
        x2 = avgX;
        y2 = maxY + EXTEND;
      } else {
        // Horizontal guide: straight line at average y
        const avgY = (sA.y + sB.y) / 2;
        const minX = Math.min(sA.x, sB.x);
        const maxX = Math.max(sA.x, sB.x);
        x1 = minX - EXTEND;
        y1 = avgY;
        x2 = maxX + EXTEND;
        y2 = avgY;
      }

      elements.push(
        <SvgLine
          key={`align-${ci}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={COLORS.guide}
          strokeWidth={1.5}
          strokeDasharray="6,4"
          strokeLinecap="round"
        />,
      );
    }

    // ---- PositionCheck: arrow at the keypoint ----
    if (check.type === 'position') {
      const pc = check as PositionCheck;
      const kp = findKeypointByName(pose.keypoints, pc.keypoint);
      const ref = findKeypointByName(pose.keypoints, pc.reference);
      if (!kp || !ref) continue;

      const sPt = mapToScreen(kp, width, height, isFrontCamera);
      if (!sPt) continue;

      let arrowPath: string;
      const offset = 15; // offset from joint centre
      switch (pc.relation) {
        case 'above':
          arrowPath = arrowUp(sPt.x, sPt.y - offset);
          break;
        case 'below':
          arrowPath = arrowDown(sPt.x, sPt.y + offset);
          break;
        case 'left_of':
          arrowPath = arrowLeft(sPt.x - offset, sPt.y);
          break;
        case 'right_of':
          arrowPath = arrowRight(sPt.x + offset, sPt.y);
          break;
      }

      elements.push(
        <Path
          key={`pos-${ci}`}
          d={arrowPath}
          fill={COLORS.guide}
        />,
      );
    }

    // DistanceCheck: intentionally skipped — not used by any exercise rules
  }

  if (elements.length === 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {elements}
    </Svg>
  );
};

// ---------------------------------------------------------------------------
// Memoised export
// ---------------------------------------------------------------------------

export const GuideOverlay = React.memo(
  GuideOverlayInner,
  (prev, next) =>
    prev.pose.timestamp === next.pose.timestamp &&
    prev.exerciseId === next.exerciseId &&
    prev.width === next.width &&
    prev.height === next.height,
);
