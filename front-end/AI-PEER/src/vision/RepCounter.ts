import { Pose } from './types';
import { RepConfig } from './exercises/types';
import { calculateAngle, isConfident } from './exercises/utils';

type RepPhase = 'idle' | 'in_start' | 'in_end';

const COOLDOWN_MS = 2000;

export class RepCounter {
  private phase: RepPhase = 'idle';
  private _count = 0;
  private config: RepConfig;
  private lastRepTime = 0;

  constructor(config: RepConfig) {
    this.config = config;
  }

  get count() { return this._count; }
  get targetReps() { return this.config.targetReps; }

  update(pose: Pose): number {
    const { keypoints, startMin, startMax, endMin, endMax } = this.config;
    const [p1Name, vertexName, p3Name] = keypoints;

    const p1 = pose.keypoints.find(k => k.name === p1Name);
    const vertex = pose.keypoints.find(k => k.name === vertexName);
    const p3 = pose.keypoints.find(k => k.name === p3Name);

    if (!p1 || !vertex || !p3) return this._count;
    if (!isConfident(p1) || !isConfident(vertex) || !isConfident(p3)) return this._count;

    const angle = calculateAngle(p1, vertex, p3);
    const inStart = angle >= startMin && angle <= startMax;
    const inEnd = angle >= endMin && angle <= endMax;

    switch (this.phase) {
      case 'idle':
        if (inStart) this.phase = 'in_start';
        break;
      case 'in_start':
        if (inEnd) this.phase = 'in_end';
        break;
      case 'in_end':
        if (inStart && Date.now() - this.lastRepTime >= COOLDOWN_MS) {
          this._count++;
          this.lastRepTime = Date.now();
          this.phase = 'in_start';
        }
        break;
    }

    return this._count;
  }

  reset() {
    this._count = 0;
    this.phase = 'idle';
    this.lastRepTime = 0;
  }
}
