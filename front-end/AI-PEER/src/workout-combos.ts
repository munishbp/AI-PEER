export type WorkoutCombo = {
  id: number;
  warmup: [string, string];
  strength: [string, string];
  balance: [string, string];
};

// 20 pre-built workout routines.
// Each picks 2 warmups, 2 strength, 2 balance.
// Exercises are spread evenly so each appears roughly the same number of times.
export const WORKOUT_COMBOS: WorkoutCombo[] = [
  { id: 0,  warmup: ["warmup-1", "warmup-2"], strength: ["strength-1", "strength-2"], balance: ["balance-1", "balance-2"] },
  { id: 1,  warmup: ["warmup-3", "warmup-4"], strength: ["strength-3", "strength-4"], balance: ["balance-3", "balance-4"] },
  { id: 2,  warmup: ["warmup-5", "warmup-1"], strength: ["strength-5", "strength-1"], balance: ["balance-5", "balance-6"] },
  { id: 3,  warmup: ["warmup-2", "warmup-3"], strength: ["strength-2", "strength-3"], balance: ["balance-7", "balance-8"] },
  { id: 4,  warmup: ["warmup-4", "warmup-5"], strength: ["strength-4", "strength-5"], balance: ["balance-9", "balance-10"] },
  { id: 5,  warmup: ["warmup-1", "warmup-3"], strength: ["strength-1", "strength-3"], balance: ["balance-11", "balance-1"] },
  { id: 6,  warmup: ["warmup-2", "warmup-4"], strength: ["strength-2", "strength-4"], balance: ["balance-2", "balance-5"] },
  { id: 7,  warmup: ["warmup-5", "warmup-3"], strength: ["strength-5", "strength-2"], balance: ["balance-3", "balance-7"] },
  { id: 8,  warmup: ["warmup-1", "warmup-4"], strength: ["strength-1", "strength-4"], balance: ["balance-6", "balance-9"] },
  { id: 9,  warmup: ["warmup-2", "warmup-5"], strength: ["strength-3", "strength-5"], balance: ["balance-8", "balance-10"] },
  { id: 10, warmup: ["warmup-3", "warmup-1"], strength: ["strength-2", "strength-5"], balance: ["balance-4", "balance-11"] },
  { id: 11, warmup: ["warmup-4", "warmup-2"], strength: ["strength-1", "strength-5"], balance: ["balance-1", "balance-6"] },
  { id: 12, warmup: ["warmup-5", "warmup-4"], strength: ["strength-3", "strength-1"], balance: ["balance-2", "balance-9"] },
  { id: 13, warmup: ["warmup-1", "warmup-5"], strength: ["strength-4", "strength-2"], balance: ["balance-3", "balance-11"] },
  { id: 14, warmup: ["warmup-3", "warmup-2"], strength: ["strength-5", "strength-3"], balance: ["balance-5", "balance-8"] },
  { id: 15, warmup: ["warmup-4", "warmup-1"], strength: ["strength-2", "strength-1"], balance: ["balance-7", "balance-10"] },
  { id: 16, warmup: ["warmup-5", "warmup-2"], strength: ["strength-4", "strength-3"], balance: ["balance-4", "balance-6"] },
  { id: 17, warmup: ["warmup-3", "warmup-5"], strength: ["strength-5", "strength-4"], balance: ["balance-1", "balance-9"] },
  { id: 18, warmup: ["warmup-1", "warmup-4"], strength: ["strength-1", "strength-3"], balance: ["balance-10", "balance-11"] },
  { id: 19, warmup: ["warmup-2", "warmup-3"], strength: ["strength-2", "strength-5"], balance: ["balance-5", "balance-7"] },
];
