import { Pose } from './types';
import { RepConfig } from './exercises/types';
import { calculateAngle, isConfident } from './exercises/utils';

type RepPhase = 'idle' | 'in_start' | 'in_end';

const COOLDOWN_MS = 1200;

// must stay in a zone for this many consecutive frames before transitioning
const REQUIRED_FRAMES = 3;

// angle must travel at least this far between start and end to count as a real rep
const MIN_MOVEMENT_DEGREES = 15;

// moving average window size for angle smoothing
const ANGLE_BUFFER_SIZE = 5;

export class RepCounter {
  private phase: RepPhase = 'idle';
  private _count = 0;
  private config: RepConfig;
  private lastRepTime = 0;

  // frame persistence: how many consecutive frames the angle has been in the target zone
  private framesInZone = 0;
  private lastInZone: 'start' | 'end' | 'none' = 'none';

  // movement tracking: angle when we confirmed entry into the start phase
  private startEntryAngle: number | null = null;
  // track the peak angle reached during the end phase
  private endPeakAngle: number | null = null;

  // angle smoothing: rolling buffer of recent angle readings
  private angleBuffer: number[] = [];

  constructor(config: RepConfig) {
    this.config = config;
  }

  get count() { return this._count; }
  get targetReps() { return this.config.targetReps; }

  // debug: last calculated angle and current phase (for on-screen display)
  private _lastAngle: number | null = null;
  get lastAngle() { return this._lastAngle; }
  get currentPhase() { return this.phase; }

  private smoothAngle(rawAngle: number): number {
    this.angleBuffer.push(rawAngle);
    if (this.angleBuffer.length > ANGLE_BUFFER_SIZE) {
      this.angleBuffer.shift();
    }
    const sum = this.angleBuffer.reduce((a, b) => a + b, 0);
    return sum / this.angleBuffer.length;
  }

  update(pose: Pose): number {
    const { keypoints, startMin, startMax, endMin, endMax } = this.config;
    const [p1Name, vertexName, p3Name] = keypoints;

    const p1 = pose.keypoints.find(k => k.name === p1Name);
    const vertex = pose.keypoints.find(k => k.name === vertexName);
    const p3 = pose.keypoints.find(k => k.name === p3Name);

    if (!p1 || !vertex || !p3) return this._count;
    if (!isConfident(p1) || !isConfident(vertex) || !isConfident(p3)) return this._count;

    const rawAngle = calculateAngle(p1, vertex, p3);
    const angle = this.smoothAngle(rawAngle);
    this._lastAngle = Math.round(angle * 10) / 10;
    const inStart = angle >= startMin && angle <= startMax;
    const inEnd = angle >= endMin && angle <= endMax;

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
          this.startEntryAngle = angle;
          this.endPeakAngle = null;
        }
        break;

      case 'in_start':
        if (confirmedInEnd) {
          this.phase = 'in_end';
          this.endPeakAngle = angle;
        }
        break;

      case 'in_end':
        // track the furthest the angle gets into the end zone
        if (inEnd && this.endPeakAngle !== null) {
          // for exercises where end < start (e.g. knee bends), peak is the minimum
          // for exercises where end > start (e.g. sit-to-stand), peak is the maximum
          if (endMin < startMin) {
            this.endPeakAngle = Math.min(this.endPeakAngle, angle);
          } else {
            this.endPeakAngle = Math.max(this.endPeakAngle, angle);
          }
        }

        if (confirmedInStart && Date.now() - this.lastRepTime >= COOLDOWN_MS) {
          // verify real movement occurred
          const traveled = this.startEntryAngle !== null && this.endPeakAngle !== null
            ? Math.abs(this.startEntryAngle - this.endPeakAngle)
            : 0;

          if (traveled >= MIN_MOVEMENT_DEGREES) {
            this._count++;
            this.lastRepTime = Date.now();
          }
          // reset for next rep regardless
          this.phase = 'in_start';
          this.startEntryAngle = angle;
          this.endPeakAngle = null;
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
    this.startEntryAngle = null;
    this.endPeakAngle = null;
    this.angleBuffer = [];
  }
}
