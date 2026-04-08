import { BASE } from "./api";
import { exerciseRegistry } from "./vision/exercises";

/** Shape returned by each /video/* endpoint */
export type VideoResponse = {
  videoId: string;
  videoUrl: string;
  title: string;
  duration: number;
  expiresIn: number;
};

/** Maps exercise IDs to their backend video endpoint paths */
const EXERCISE_VIDEO_ENDPOINTS: Record<string, string> = {
  // Warm-up (5)
  "warmup-1": "/video/getHeadURL",
  "warmup-2": "/video/getNeckURL",
  "warmup-3": "/video/getBackURL",
  "warmup-4": "/video/getTrunkURL",
  "warmup-5": "/video/getAnkleURL",
  // Strength (5)
  "strength-1": "/video/getFrntKneeURL",
  "strength-2": "/video/getBackKneeURL",
  "strength-3": "/video/getSideHipURL",
  "strength-4": "/video/getCalfRaisesURL",
  "strength-5": "/video/getToeRaisesURL",
  // Balance (11)
  "balance-1": "/video/getKneeBendsURL",
  "balance-2": "/video/getSitStandURL",
  "balance-3": "/video/getSWWalkURL",
  "balance-4": "/video/getBWWalkURL",
  "balance-5": "/video/getWalkTurnURL",
  "balance-6": "/video/getOLStandURL",
  "balance-7": "/video/getHTStandURL",
  "balance-8": "/video/getHTWalkURL",
  "balance-9": "/video/getHWalkURL",
  "balance-10": "/video/getToeWalkURL",
  "balance-11": "/video/getHTWalkBkwdURL",
  // Assessment (3) — clinical fall-risk tests, videos in GCS Assessment Videos/
  "assessment-1": "/video/getCRiseURL",
  "assessment-2": "/video/getBalanceURL",
  "assessment-3": "/video/getTugURL",
};

/** Fetch a signed video URL for an exercise (requires auth token) */
export async function fetchVideoUrl(
  exerciseId: string,
  token: string
): Promise<VideoResponse> {
  const endpoint = EXERCISE_VIDEO_ENDPOINTS[exerciseId];
  if (!endpoint) {
    throw new Error(`No video endpoint for exercise "${exerciseId}"`);
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<VideoResponse>;
}

/** Get exercise videos for a category (synchronous, reads from registry) */
export function getExerciseVideos(
  category: string
): { exerciseId: string; name: string }[] {
  return Object.entries(exerciseRegistry)
    .filter(
      ([id, rule]) =>
        rule.category === category && EXERCISE_VIDEO_ENDPOINTS[id]
    )
    .map(([id, rule]) => ({ exerciseId: id, name: rule.name }));
}
