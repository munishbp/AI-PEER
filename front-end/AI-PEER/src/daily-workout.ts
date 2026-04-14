import { WorkoutCombo } from "./workout-combos";
import { getExerciseActivityRecords } from "./exercise-activity-storage";

// Full lists sourced from src/video.ts. Today's Workout always includes
// every warmup and every strength exercise; balance is limited to 3 per
// day because there are 11 to choose from and doing them all in one
// session is too much.
const ALL_WARMUPS = [
  "warmup-1",
  "warmup-2",
  "warmup-3",
  "warmup-4",
  "warmup-5",
];

const ALL_STRENGTH = [
  "strength-1",
  "strength-2",
  "strength-3",
  "strength-4",
  "strength-5",
];

const ALL_BALANCE = [
  "balance-1",
  "balance-2",
  "balance-3",
  "balance-4",
  "balance-5",
  "balance-6",
  "balance-7",
  "balance-8",
  "balance-9",
  "balance-10",
  "balance-11",
];

const BALANCE_PER_DAY = 3;

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Hash a date string to a seed. Same date → same seed → same balance pick,
// so the day's 3 balance exercises are stable across renders but rotate daily.
function seedFromDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) | 0;
  }
  return h;
}

// Deterministic Fisher-Yates using a linear-congruential generator seeded
// by the date. Picks `k` distinct items from `pool`.
function pickDeterministic<T>(pool: T[], k: number, seed: number): T[] {
  const out = pool.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) | 0;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, k);
}

export async function getTodaysWorkout(): Promise<WorkoutCombo> {
  const seed = seedFromDate(todayString());
  return {
    warmup: ALL_WARMUPS,
    strength: ALL_STRENGTH,
    balance: pickDeterministic(ALL_BALANCE, BALANCE_PER_DAY, seed),
  };
}

// Today's workout minus anything the user already completed today.
// Re-read on focus to reflect newly finished sessions.
export async function getTodaysRemainingWorkout(): Promise<WorkoutCombo> {
  const [workout, records] = await Promise.all([
    getTodaysWorkout(),
    getExerciseActivityRecords(),
  ]);
  const today = todayString();
  const doneToday = new Set(
    records
      .filter((r) => r.completedAt.slice(0, 10) === today && r.totalReps > 0)
      .map((r) => r.exerciseId)
  );
  return {
    warmup: workout.warmup.filter((id) => !doneToday.has(id)),
    strength: workout.strength.filter((id) => !doneToday.has(id)),
    balance: workout.balance.filter((id) => !doneToday.has(id)),
  };
}
