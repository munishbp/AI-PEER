import { Pose } from './types';
import { RepConfig } from './exercises/types';
import { calculateAngle, calculateAngle3D, isConfident } from './exercises/utils';

type RepPhase = 'idle' | 'in_start' | 'in_end';

const COOLDOWN_MS = 1200;

// must stay in a zone for this many consecutive frames before transitioning
const REQUIRED_FRAMES = 2;

// measurement must travel at least this far between start and end to count
const MIN_MOVEMENT_ANGLE = 15;    // degrees for angle mode
const MIN_MOVEMENT_DISTANCE = 0.05; // ratio for distance mode

export class RepCounter {
  private phase: RepPhase = 'idle';
  private _count = 0;
  private config: RepConfig;
  private lastRepTime = 0;

  // frame persistence
  private framesInZone = 0;
  private lastInZone: 'start' | 'end' | 'none' = 'none';

  // movement tracking
  private startEntryValue: number | null = null;
  private endPeakValue: number | null = null;

  constructor(config: RepConfig) {
    this.config = config;
  }

  get count() { return this._count; }
  get targetReps() { return this.config.targetReps; }

  // debug
  private _lastAngle: number | null = null;
  private _debugConfidences: string = '';
  private _debugPositions: string = '';
  get lastAngle() { return this._lastAngle; }
  get currentPhase() { return this.phase; }
  get debugConfidences() { return this._debugConfidences; }
  get debugPositions() { return this._debugPositions; }

  private computeValue(pose: Pose): number | null {
    const { keypoints, mode } = this.config;
    const [kp1Name, kp2Name, kp3Name] = keypoints;

    const kp1 = pose.keypoints.find(k => k.name === kp1Name);
    const kp2 = pose.keypoints.find(k => k.name === kp2Name);
    const kp3 = pose.keypoints.find(k => k.name === kp3Name);

    if (!kp1 || !kp2 || !kp3) return null;

    this._debugConfidences = `${kp1Name}:${kp1.confidence.toFixed(2)} ${kp2Name}:${kp2.confidence.toFixed(2)} ${kp3Name}:${kp3.confidence.toFixed(2)}`;

    if (!isConfident(kp1) || !isConfident(kp2) || !isConfident(kp3)) return null;

    if (mode === 'distance') {
      // kp1 = moving knee, kp2 = anchor knee, kp3 = reference (hip) for normalization
      const dx = Math.abs(kp1.x - kp2.x);
      const dy = Math.abs(kp1.y - kp2.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const torsoHeight = Math.abs(kp3.y - kp2.y);
      const ratio = torsoHeight > 0.01 ? dist / torsoHeight : 0;
      this._debugPositions = `dx:${dx.toFixed(3)} dy:${dy.toFixed(3)} dist:${dist.toFixed(3)} norm:${ratio.toFixed(3)}`;
      return ratio;
    }

    if (mode === 'angle3d') {
      const angle3d = calculateAngle3D(kp1, kp2, kp3);
      this._debugPositions = `3D ${kp3Name}: (${kp3.x.toFixed(3)}, ${kp3.y.toFixed(3)}, z:${(kp3.z ?? 0).toFixed(3)})`;
      return angle3d;
    }

    // default: angle mode (2D)
    const angle = calculateAngle(kp1, kp2, kp3);
    this._debugPositions = `${kp3Name}: (${kp3.x.toFixed(3)}, ${kp3.y.toFixed(3)})`;
    return angle;
  }

  update(pose: Pose): number {
    const { startMin, startMax, endMin, endMax, mode } = this.config;
    const minMovement = mode === 'distance' ? MIN_MOVEMENT_DISTANCE : MIN_MOVEMENT_ANGLE;

    const value = this.computeValue(pose);
    if (value === null) return this._count;

    this._lastAngle = Math.round(value * (mode === 'distance' ? 1000 : 10)) / (mode === 'distance' ? 1000 : 10);

    const inStart = value >= startMin && value <= startMax;
    const inEnd = value >= endMin && value <= endMax;

    // track consecutive frames in the same zone
    const currentZone: 'start' | 'end' | 'none' = inStart ? 'start' : inEnd ? 'end' : 'none';
    if (currentZone === this.lastInZone && currentZone !== 'none') {
      this.framesInZone++;
    } else {
      this.framesInZone = currentZone !== 'none' ? 1 : 0;
    }
    this.lastInZone = currentZone;

    const confirmedInStart = currentZone === 'start' && this.framesInZone >= REQUIRED_FRAMES;
    const confirmedInEnd = currentZone === 'end' && this.framesInZone >= REQUIRED_FRAMES;

    switch (this.phase) {
      case 'idle':
        if (confirmedInStart) {
          this.phase = 'in_start';
          this.startEntryValue = value;
          this.endPeakValue = null;
        }
        break;

      case 'in_start':
        if (confirmedInEnd) {
          this.phase = 'in_end';
          this.endPeakValue = value;
        }
        break;

      case 'in_end':
        if (inEnd && this.endPeakValue !== null) {
          if (endMin < startMin) {
            this.endPeakValue = Math.min(this.endPeakValue, value);
          } else {
            this.endPeakValue = Math.max(this.endPeakValue, value);
          }
        }

        if (confirmedInStart && Date.now() - this.lastRepTime >= COOLDOWN_MS) {
          const traveled = this.startEntryValue !== null && this.endPeakValue !== null
            ? Math.abs(this.startEntryValue - this.endPeakValue)
            : 0;

          if (traveled >= minMovement) {
            this._count++;
            this.lastRepTime = Date.now();
          }
          this.phase = 'in_start';
          this.startEntryValue = value;
          this.endPeakValue = null;
        }
        break;
    }

    return this._count;
  }

  reset() {
    this._count = 0;
    this.phase = 'idle';
    this.lastRepTime = 0;
    this.framesInZone = 0;
    this.lastInZone = 'none';
    this.startEntryValue = null;
    this.endPeakValue = null;
  }
}
