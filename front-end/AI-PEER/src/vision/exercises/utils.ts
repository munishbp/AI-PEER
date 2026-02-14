/**
 * utils.ts - Geometry utilities for form analysis
 *
 * Helper functions for calculating angles, distances, and alignments
 * between keypoints.
 */

import { Keypoint } from '../types';

/**
 * Calculate angle between three points in degrees.
 * The angle is measured at point p2 (the vertex).
 *
 * @param p1 - First point
 * @param p2 - Middle point (vertex of angle)
 * @param p3 - Third point
 * @returns Angle in degrees (0-180)
 *
 * Example: calculateAngle(shoulder, elbow, wrist) gives elbow bend angle
 */
export function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  // Vector from p2 to p1
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;

  // Vector from p2 to p3
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  // Dot product
  const dot = v1x * v2x + v1y * v2y;

  // Magnitudes
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  // Calculate angle in radians, then convert to degrees
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const radians = Math.acos(cosAngle);
  const degrees = radians * (180 / Math.PI);

  return degrees;
}

/**
 * Calculate the angle a line makes with vertical (y-axis).
 * 0 degrees = perfectly vertical, 90 degrees = horizontal
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Angle from vertical in degrees (0-90)
 */
export function angleFromVertical(p1: Keypoint, p2: Keypoint): number {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);

  if (dy === 0) {
    return 90; // Horizontal
  }

  const radians = Math.atan(dx / dy);
  return radians * (180 / Math.PI);
}

/**
 * Calculate the angle a line makes with horizontal (x-axis).
 * 0 degrees = perfectly horizontal, 90 degrees = vertical
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Angle from horizontal in degrees (0-90)
 */
export function angleFromHorizontal(p1: Keypoint, p2: Keypoint): number {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);

  if (dx === 0) {
    return 90; // Vertical
  }

  const radians = Math.atan(dy / dx);
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two keypoints.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance (in normalized coordinates)
 */
export function distance(p1: Keypoint, p2: Keypoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if point a is above point b (lower y value = higher on screen).
 */
export function isAbove(a: Keypoint, b: Keypoint): boolean {
  return a.y < b.y;
}

/**
 * Check if point a is below point b.
 */
export function isBelow(a: Keypoint, b: Keypoint): boolean {
  return a.y > b.y;
}

/**
 * Check if point a is to the left of point b.
 */
export function isLeftOf(a: Keypoint, b: Keypoint): boolean {
  return a.x < b.x;
}

/**
 * Check if point a is to the right of point b.
 */
export function isRightOf(a: Keypoint, b: Keypoint): boolean {
  return a.x > b.x;
}

/**
 * Get the midpoint between two keypoints.
 */
export function midpoint(p1: Keypoint, p2: Keypoint): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Check if a keypoint has sufficient confidence to be used.
 */
export function isConfident(keypoint: Keypoint, minConfidence: number = 0.5): boolean {
  return keypoint.confidence >= minConfidence;
}
