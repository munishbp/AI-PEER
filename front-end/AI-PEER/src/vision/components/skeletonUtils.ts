/**
 * skeletonUtils.ts - Shared utilities for SkeletonOverlay and GuideOverlay
 *
 * Provides coordinate mapping, violation color lookup, SVG arc helpers,
 * and keypoint search used by both overlay components.
 */

import type { Keypoint, FormFeedback } from '@/src/vision/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const COLORS = {
  good: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  guide: 'rgba(59,130,246,0.5)',
} as const;

/** Model input dimension used for de-normalizing raw pixel coordinates. */
const MODEL_INPUT_SIZE = 640;

// ---------------------------------------------------------------------------
// Coordinate mapping
// ---------------------------------------------------------------------------

/**
 * Convert a keypoint from model-space to screen-space.
 *
 * - Drops low-confidence keypoints (< 0.5).
 * - Handles both normalised (0-1) and raw pixel (> 1.5) coordinate formats.
 * - Mirrors the x axis for front-facing cameras.
 */
export function mapToScreen(
  kp: Keypoint,
  width: number,
  height: number,
  isFrontCamera: boolean,
): { x: number; y: number } | null {
  if (kp.confidence < 0.4) return null;

  let nx = kp.x;
  let ny = kp.y;

  // If coordinates look like raw pixels (> 1.5), normalise them.
  if (nx > 1.5 || ny > 1.5) {
    nx /= MODEL_INPUT_SIZE;
    ny /= MODEL_INPUT_SIZE;
  }

  // Mirror for front camera so the overlay feels natural (like a mirror).
  if (isFrontCamera) {
    nx = 1 - nx;
  }

  return {
    x: nx * width,
    y: ny * height,
  };
}

// ---------------------------------------------------------------------------
// Violation helpers
// ---------------------------------------------------------------------------

/**
 * Build a lookup map from body-part name to its worst severity.
 *
 * 'error' always wins over 'warning' if a part appears in multiple violations.
 */
export function getViolationMap(
  feedback: FormFeedback | null,
): Map<string, 'error' | 'warning'> {
  const map = new Map<string, 'error' | 'warning'>();
  if (!feedback) return map;

  for (const v of feedback.violations) {
    const existing = map.get(v.bodyPart);
    if (existing === 'error') continue; // already worst
    map.set(v.bodyPart, v.severity);
  }

  return map;
}

/**
 * Check whether a single keypoint name matches any entry in the violation map.
 *
 * Matching rules:
 *  1. Exact match  -- e.g. violation "left_knee"  matches kp "left_knee".
 *  2. Partial match -- e.g. violation "knee" matches kp "left_knee" or "right_knee".
 *
 * Returns the worst matched severity, or `undefined` if no match.
 */
function matchSeverity(
  kpName: string,
  violationMap: Map<string, 'error' | 'warning'>,
): 'error' | 'warning' | undefined {
  // Fast path: exact match
  const exact = violationMap.get(kpName);
  if (exact) return exact;

  // Partial match: a violation bodyPart that is a substring of the kpName
  let worst: 'error' | 'warning' | undefined;
  for (const [bodyPart, severity] of violationMap) {
    if (kpName.includes(bodyPart)) {
      if (severity === 'error') return 'error'; // can't get worse
      worst = severity;
    }
  }
  return worst;
}

/**
 * Determine the colour for a bone (line between two keypoints) based on
 * whether either endpoint is flagged in the violation map.
 */
export function getBoneColor(
  kpAName: string,
  kpBName: string,
  violationMap: Map<string, 'error' | 'warning'>,
): string {
  const sevA = matchSeverity(kpAName, violationMap);
  const sevB = matchSeverity(kpBName, violationMap);

  if (sevA === 'error' || sevB === 'error') return COLORS.error;
  if (sevA === 'warning' || sevB === 'warning') return COLORS.warning;
  return COLORS.good;
}

/**
 * Determine the colour for a single keypoint based on violations.
 */
export function getKeypointColor(
  kpName: string,
  violationMap: Map<string, 'error' | 'warning'>,
): string {
  const sev = matchSeverity(kpName, violationMap);
  if (sev === 'error') return COLORS.error;
  if (sev === 'warning') return COLORS.warning;
  return COLORS.good;
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

/**
 * Generate an SVG path `d` string that describes a circular arc.
 *
 * @param cx         Centre x of the circle.
 * @param cy         Centre y of the circle.
 * @param radius     Radius of the arc.
 * @param startAngle Start angle in **degrees** (0 = 3 o'clock, clockwise).
 * @param endAngle   End angle in **degrees**.
 * @returns          An SVG path string, e.g. `M sx sy A r r 0 laf 1 ex ey`.
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const startRad = toRad(startAngle);
  const endRad = toRad(endAngle);

  const startX = cx + radius * Math.cos(startRad);
  const startY = cy + radius * Math.sin(startRad);
  const endX = cx + radius * Math.cos(endRad);
  const endY = cy + radius * Math.sin(endRad);

  // Sweep of the arc -- normalise to a positive value.
  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;

  const largeArcFlag = sweep > 180 ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
}

// ---------------------------------------------------------------------------
// Keypoint lookup
// ---------------------------------------------------------------------------

/**
 * Find a keypoint in an array by its `name` field.
 */
export function findKeypointByName(
  keypoints: Keypoint[],
  name: string,
): Keypoint | undefined {
  return keypoints.find((kp) => kp.name === name);
}
