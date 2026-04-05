import AsyncStorage from "@react-native-async-storage/async-storage";
import { WORKOUT_COMBOS, WorkoutCombo } from "./workout-combos";

const STORAGE_KEY = "daily_workout_v1";

type StoredWorkout = {
  comboId: number;
  date: string; // YYYY-MM-DD
};

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Simple hash from date string → number 0-19
function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) | 0;
  }
  return ((h % 20) + 20) % 20; // ensure positive
}

export async function getTodaysWorkout(): Promise<WorkoutCombo> {
  const today = todayString();

  // Check if we already picked today's combo
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: StoredWorkout = JSON.parse(raw);
      if (stored.date === today) {
        return WORKOUT_COMBOS[stored.comboId];
      }

      // Pick today's combo, avoid yesterday's
      let comboId = hashDate(today);
      if (comboId === stored.comboId) {
        comboId = (comboId + 1) % 20;
      }

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ comboId, date: today })
      );
      return WORKOUT_COMBOS[comboId];
    }
  } catch {
    // fall through to fresh pick
  }

  // First time — no stored data
  const comboId = hashDate(today);
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ comboId, date: today })
  );
  return WORKOUT_COMBOS[comboId];
}
