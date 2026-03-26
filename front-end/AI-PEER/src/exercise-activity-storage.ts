import AsyncStorage from "@react-native-async-storage/async-storage";

const EXERCISE_ACTIVITY_KEY = "exercise_activity_records_v1";
const MAX_RECORDS = 500;

export type ExerciseActivityCategory =
  | "warmup"
  | "strength"
  | "balance"
  | "assessment"
  | "other";

export type ExerciseCompletionRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: ExerciseActivityCategory;
  completedAt: string; // ISO date string
  repCount: number;
  durationSec: number;
  avgScore: number | null;
  framesAnalyzed: number;
};

type NewExerciseCompletionInput = Omit<ExerciseCompletionRecord, "id" | "completedAt"> & {
  id?: string;
  completedAt?: string;
};

function isValidCategory(value: unknown): value is ExerciseActivityCategory {
  return (
    value === "warmup" ||
    value === "strength" ||
    value === "balance" ||
    value === "assessment" ||
    value === "other"
  );
}

function sanitizeRecord(
  raw: Partial<ExerciseCompletionRecord>
): ExerciseCompletionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string") return null;
  if (typeof raw.exerciseId !== "string") return null;
  if (typeof raw.exerciseName !== "string") return null;
  if (!isValidCategory(raw.category)) return null;
  if (typeof raw.completedAt !== "string") return null;
  if (Number.isNaN(new Date(raw.completedAt).getTime())) return null;
  const normalizedRepCount =
    typeof raw.repCount === "number"
      ? Math.max(0, Math.round(raw.repCount))
      : 0;
  if (typeof raw.durationSec !== "number") return null;
  if (
    raw.avgScore !== null &&
    raw.avgScore !== undefined &&
    typeof raw.avgScore !== "number"
  ) {
    return null;
  }
  if (typeof raw.framesAnalyzed !== "number") return null;

  return {
    id: raw.id,
    exerciseId: raw.exerciseId,
    exerciseName: raw.exerciseName,
    category: raw.category,
    completedAt: raw.completedAt,
    repCount: normalizedRepCount,
    durationSec: raw.durationSec,
    avgScore: raw.avgScore ?? null,
    framesAnalyzed: raw.framesAnalyzed,
  };
}

function sortByNewest(records: ExerciseCompletionRecord[]): ExerciseCompletionRecord[] {
  return [...records].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

export async function getExerciseActivityRecords(): Promise<
  ExerciseCompletionRecord[]
> {
  const raw = await AsyncStorage.getItem(EXERCISE_ACTIVITY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<ExerciseCompletionRecord>[];
    if (!Array.isArray(parsed)) return [];

    const validRecords = parsed
      .map((item) => sanitizeRecord(item))
      .filter((item): item is ExerciseCompletionRecord => item !== null);

    return sortByNewest(validRecords);
  } catch {
    return [];
  }
}

export async function appendExerciseCompletion(
  input: NewExerciseCompletionInput
): Promise<ExerciseCompletionRecord> {
  const existing = await getExerciseActivityRecords();

  const record: ExerciseCompletionRecord = {
    id: input.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    category: input.category,
    completedAt: input.completedAt ?? new Date().toISOString(),
    repCount: Math.max(0, Math.round(input.repCount)),
    durationSec: Math.max(0, Math.round(input.durationSec)),
    avgScore:
      input.avgScore === null || input.avgScore === undefined
        ? null
        : Math.round(input.avgScore),
    framesAnalyzed: Math.max(0, Math.round(input.framesAnalyzed)),
  };

  const merged = sortByNewest([record, ...existing]).slice(0, MAX_RECORDS);
  await AsyncStorage.setItem(EXERCISE_ACTIVITY_KEY, JSON.stringify(merged));

  return record;
}

export async function clearExerciseActivityRecords(): Promise<void> {
  await AsyncStorage.removeItem(EXERCISE_ACTIVITY_KEY);
}
