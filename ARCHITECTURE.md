# Architecture

## System Overview

AI-PEER is a HIPAA-compliant mobile application for fall risk assessment and exercise intervention. The system has four components: a React Native mobile app (bare workflow with Expo libraries), an Express API on Cloud Run, Firebase services (Firestore, Auth, Cloud Functions), and Google Cloud Storage.

The core design principle is that all ML inference stays on-device. The LLM (Qwen3.5-2B, finetuned on [YsK-dev/geriatric-health-advice](https://huggingface.co/datasets/YsK-dev/geriatric-health-advice), Apache 2.0) and pose estimation model (MediaPipe Pose Landmarker) both run locally on the phone. No patient conversation data or video frames leave the device.

### i18n + TTS Subsystem

The app supports three locales: English (`en`), Spanish (`es`), and Haitian Creole (`ht`). Translation files live at `front-end/AI-PEER/src/locales/{en,es,ht}/translation.json` and are bundled at build time. Locale initialization is in `src/i18n.ts`, which uses `i18next` + `react-i18next` with `fallbackLng: "en"` and `compatibilityJSON: "v4"`.

The user's chosen language is stored as part of the `Prefs` object under AsyncStorage key `accessibility_prefs_v1` (`src/prefs-context.tsx:15`). `PrefsProvider` loads preferences on mount and calls `i18n.changeLanguage(prefs.language)` whenever the `language` field changes (`src/prefs-context.tsx:72`). The full preferences object (font scale, contrast, language, sound alerts) is written back to AsyncStorage on every change (`src/prefs-context.tsx:62`).

Text-to-speech is provided by `expo-speech` via the helper `src/tts.ts`. `ttsLanguage()` maps `i18n.language` to an expo-speech `language` option: `en` → `"en-US"`, `es` → `"es-ES"`, `ht` → `"fr-FR"` (`src/tts.ts:7-10`). The French voice is used for Haitian Creole because iOS ships no native Creole voice; this is a known approximation. All TTS call sites use `speak()` from `src/tts.ts` rather than calling `expo-speech` directly, so the language mapping is applied uniformly.

## System Diagram

```
  Mobile Device                              Google Cloud (research-ai-peer-dev)
  +-------------------------------+         +----------------------------------+
  | React Native App              |         | Cloud Run                        |
  |                               |  HTTPS  |   aipeer-api (Express 5.1)       |
  |  Expo Router (screens)        |-------->|   /auth        - SMS 2FA         |
  |  llama.rn (Qwen3.5-2B)        |<--------|   /users       - CRUD            |
  |  MediaPipe Pose + Hand        |         |   /video       - signed URLs     |
  |   (single VisionCamera plugin)|         |   /model       - LLM download    |
  |  AsyncStorage (local)         |         |   /activities  - exercise records|
  +-------------------------------+         +-----------------+----------------+
                                                              |
                                            +-----------------v----------------+
                                            | Firestore (database: ai-peer)    |
                                            |   users                          |
                                            |     /{uid}/activities/{actId}    |
                                            |   verificationSessions           |
                                            |   refreshTokens                  |
                                            |   config/redcap                  |
                                            +-----------------+----------------+
                                                              |
                                  +---------------------------+---------------------------+
                                  |                                                       |
                  +---------------v----------------+              +----------------------v----+
                  | Cloud Functions                |              | GCS Buckets                |
                  |   redcapSync (daily 2am EST)   |              |   aipeer_videos (exercise) |
                  |   REDCap <-> Firestore sync    |              |   qwenfinetune (LLM model) |
                  +--------------------------------+              +----------------------------+
```

## Authentication Flow

1. User enters phone number and password on the login screen.
2. App calls `POST /auth/send-code` with credentials and mode (login or create).
3. Backend validates credentials (bcrypt comparison for login, or creates new user for registration).
4. Backend calls Google Identity Platform to send an SMS with a 6-digit code.
5. Rate limiting enforced: 60-second cooldown between codes, max 5 per hour per phone.
6. User enters the SMS code. App calls `POST /auth/verify` (`app/verify.tsx`).
7. Backend verifies code with Identity Platform, then generates a Firebase custom token and a UUID refresh token (30-day expiry, stored in Firestore `refreshTokens` collection).
8. Client calls `signInWithCustomToken()` with the Firebase JS SDK and stores the refresh token in AsyncStorage under key `"refreshToken"` (`app/verify.tsx:41-43`).
9. Post-2FA routing: new users (`res.isNewUser || mode === 'create'`) are sent to `/welcome`; returning users go directly to `/(tabs)` (`app/verify.tsx:46-50`). There is no `tutorial.tsx` screen in this path.
10. On subsequent cold starts, `AuthContext.restoreSession` reads the refresh token from AsyncStorage and calls `POST /auth/refresh` to obtain a new Firebase custom token, then calls `signInWithCustomToken()` to re-establish the Firebase session (`src/auth/AuthContext.tsx:27-61`). This is the **cold-start token restore** path.
11. All protected API calls include the Firebase ID token as a Bearer token in the Authorization header.
12. **Dual-token auth model:** Two orthogonal refresh mechanisms coexist:
    - **Custom UUID refresh tokens** (30-day expiry, stored in Firestore `refreshTokens` and AsyncStorage): used exclusively for cold-start session restore via `AuthContext.restoreSession`. They exchange for a new Firebase custom token via `POST /auth/refresh`.
    - **Firebase internal refresh tokens** (managed by the Firebase JS SDK): used for per-request ID token freshness during an active session. For protected calls that may run mid-session (e.g., `submitActivityToBackend`), callers invoke `auth.currentUser?.getIdToken(true)` inline to force a fresh ID token directly from Firebase's token endpoint without involving the app's `/auth/refresh` route (`src/exercise-activity-storage.ts:260`). This prevents the silent 401-after-1-hour failure that would occur if the ID token captured at login time were reused across the session.
13. **`req.user` injection on the backend:** the auth middleware (`API/middleware/authMiddleware.js`) verifies the Bearer token AND attaches the decoded token to `req.user` so downstream controllers can read `req.user.uid` directly. New controllers should ALWAYS use `req.user.uid` for the user identity — taking the user id from the request body would let any authenticated caller pass another user's id (a real authorization gap). The activities controller demonstrates the correct pattern.

## Data Flow: Exercise Videos

1. Authenticated client calls `GET /video/<endpoint>` (e.g., `/video/getTugURL`) with Bearer token.
2. `authMiddleware` verifies the Firebase ID token.
3. `videoController` calls `GCS_Service.generateSignedUrl(filename)` with the file path in the `aipeer_videos` bucket.
4. On Cloud Run (no private key available): uses IAM `signBlob` API to sign the URL remotely.
5. Locally (private key in .env): signs directly with the service account key.
6. Returns a V4 signed URL with 1-hour expiration.
7. Client plays the video directly from the signed URL.

## Data Flow: On-Device LLM

1. On first use of AI Chat, the app checks if the model file exists on disk.
2. If not, calls `GET /model/getModelURL` with Bearer token to get a signed download URL.
3. The `modelController` generates a signed URL for `models/Qwen3.5-2B-aipeer-Q4_K_M.gguf` in the `qwenfinetune` bucket (separate from the video bucket via `GCS_MODEL_BUCKET` env var).
4. App downloads the ~1.2GB GGUF file to the device's document directory with progress tracking.
5. Old model files (e.g., `Qwen3-0.6B-Q4_K_M.gguf`) are automatically deleted during download.
6. `LLMService` singleton loads the model via `llama.rn` (4 CPU threads, 0 GPU layers for broad compatibility).
7. Inference uses Qwen ChatML format (`<|im_start|>` tokens) with the PEER framework system prompt.
8. The model runs in non-thinking mode (no `<think>` tags). Any residual thinking tags are stripped as a safety net.
9. Conversations persist in AsyncStorage and auto-archive after 24 hours.

## Data Flow: Vision Pipeline (Pose + Hand)

The vision pipeline runs **two MediaPipe tasks per frame** through a single custom VisionCamera plugin: Pose Landmarker for exercise form analysis, Hand Landmarker for the open-palm gesture-confirm start flow. Both tasks share the same `MediaPipeTasksVision` pod (iOS) / `tasks-vision` artifact (Android) — adding the Hand task did NOT require a new pod, gradle dependency, or new C++ compilation.

### Per-frame flow

1. `VisionCamera` captures frames from the front-facing camera.
2. The custom native plugin (`PoseLandmarkerPlugin.swift` on iOS, `PoseLandmarkerFrameProcessorPlugin.kt` on Android — both registered as `'poseLandmarker'`) receives each frame and runs BOTH MediaPipe tasks on it, sharing the same `MPImage` and the same timestamp so MediaPipe's monotonicity check applies once per frame.
3. The plugin returns a unified result: `{ pose: [...33 dicts], hands: [{ landmarks: [...21 dicts], handedness: "Left"|"Right" }] }`.
4. `frameProcessor.ts` worklet unpacks the shape and forwards both halves to `mapMediaPipeToPose` and `mapMediaPipeToHands` on the JS thread.
5. The two mappers apply the SAME landscape→portrait coordinate transform (iOS: transpose; Android: transpose + Y-flip) so pose and hand landmarks live in the same coordinate space.
6. `VisionContext.handlePoseResult` routes the pose to either the open-palm detector (if `trackingMode === 'waiting_for_gesture'`) or the form analyzer + rep counter (if `trackingMode === 'tracking'`).

### Pose path (tracking mode)

- `FormAnalyzer.checkAngle / checkAlignment / checkPosition / checkDistance` evaluate the current pose against the rules in `src/vision/exercises/`. Rules support optional **rep-zone gating** (skip the check while the user is in the start or end zone — only fire warnings in the dead zone between) and **severity gradation** (mild/moderate/severe based on degrees outside the acceptable range).
- `VisionContext` wraps the analyzer with a **300ms temporal smoother**: a violation must be continuously failing for ≥300ms before it surfaces. Single-frame keypoint glitches stay suppressed; sustained out-of-form positions still surface.
- `RepCounter` tracks reps via a state machine (`idle → in_start → in_end`) with 1.2-second cooldown, 2-frame zone persistence, 15° minimum movement validation, bilateral keypoint averaging (for two-leg exercises like knee bends), and 3D angle support (for sit-to-stand and chair rise where the user faces the camera and 2D angle is foreshortened).
- Each counted rep is logged into a per-rep history (`{ startAngle, endAngle, peakAngle, romDeg, durationMs }`), captured into the activity record at end of session.
- Form score = percentage of frames where ALL form checks passed during the activity. Binary 100/0 per frame, averaged over the session.

### Hand path (gesture-confirm mode)

- `detectOpenPalm` runs five checks: (1) all four non-thumb fingers extended in 3D (extension ratio ≥ 0.92), (2) all fingertips above the wrist in image y, (3) thumb extended away from the wrist (≥ 1.2× hand-size scale), (4) palm normal points toward the camera (cross product of `wrist→index_MCP` × `wrist→pinky_MCP`, sign disambiguated by MediaPipe's handedness label), and (5) sustained continuously for `GESTURE_HOLD_MS` (1000ms).
- Once confirmed, VisionContext transitions to `countdown` (5-second TTS countdown via expo-speech) and then to `tracking`.
- **Cross-platform sign convention:** the Android Y-flip in `mapMediaPipeToHands` inverts the cross-product sign relative to iOS, so `detectOpenPalm` branches on `Platform.OS === 'android'` and negates the expected sign. An earlier "two errors cancel" assumption (that MediaPipe handedness was inverted on Android, canceling the Y-flip) was disproved by Pixel 7 device testing — MediaPipe reports handedness correctly on Android.

### TrackingMode state machine

```
idle ──[start]──> waiting_for_gesture ──[hand held 1000ms]──> countdown ──[5s]──> tracking
  ↑                       ↑                                                          │
  └───────────[stop]──────┴──────────────────[stop]──────────────────────────────────┘
```

`idle`: nothing running. `waiting_for_gesture`: camera + pose pipeline up, gesture detector active, no rep counter. `countdown`: pose pipeline up for skeleton overlay, no analyzer, no rep counter. `tracking`: full pipeline (analyzer + smoother + rep counter). Transitions are owned by `VisionContext`. The `GestureCountdownOverlay` component renders the prompt + the countdown number visually on top of the camera in the two pre-tracking states.

### Native plugin lifecycle differences

- **iOS:** constructor-time GPU init. The plugin instance is created once when VisionCamera registers it; `setupLandmarker()` and `setupHandLandmarker()` run synchronously in `init`.
- **Android:** lazy thread-affine init in the first `callback()` invocation. MediaPipe's GPU delegate has thread affinity, and the constructor runs on the wrong thread (the JS/worklets thread rather than VisionCamera's videoQueue thread). The lazy init runs on the videoQueue thread where it'll be used. GPU→CPU fallback is per-landmarker independently.
- **Both platforms:** hold the landmarkers in process-wide singletons (Swift `private var` + Kotlin `@Volatile companion object`) so React Native fast-refresh / HMR doesn't leak instances across reloads.

### Post-session feedback summary

After the user completes all sets and the session ends, the app navigates to `app/(tabs)/exercise-summary.tsx`, passing the completed activity's `id` via the `recordId` route parameter. The screen loads the record from AsyncStorage via `getExerciseActivityRecords()`, extracts `record.feedbackEvents`, and sorts them by severity weight (severe → error → moderate → warning → mild) then by descending occurrence count. The top three events are displayed with a severity-coded dot and occurrence count (`×N`). If no feedback events were recorded and `avgScore >= 80`, an encouraging message is shown instead. The `FeedbackEvent` type is defined in `src/exercise-activity-storage.ts:32-41` as `{ message, severity, count, firstAt, lastAt }` where `firstAt`/`lastAt` are milliseconds since session start. These events are populated by the form analyzer during the `tracking` phase and carried through `submitCompletedActivity` into both AsyncStorage and the Firestore activity record.

### On-device only

All processing runs on-device. No frame data, no landmark data, and no derived form metrics ever leave the phone. The activity record persisted to Firestore contains only aggregate stats (rep counts, durations, angle summaries, feedback events) — never raw video or full landmark dumps.

> **Build dependency note:** The custom Swift plugin only compiles because `react-native-worklets-core` is declared as a direct npm dependency in `front-end/AI-PEER/package.json`. VisionCamera's frame processor support is gated on this package — without it, VisionCamera does not expose `FrameProcessorPlugin.h` and `PoseLandmarkerPlugin.swift` fails to compile.

## Data Flow: Activity Persistence

When an exercise session completes (final set submitted), the app writes a single completed-activity record to **two destinations** in parallel:

1. `submitCompletedActivity` (in `src/exercise-activity-storage.ts`) builds the canonical record from the in-memory session accumulators (rep counts per set, scores, angle history, feedback events).
2. **Local write (always):** appends to `AsyncStorage` under key `exercise_activity_records_v1`. Capped at 1000 records, sorted newest-first. This is the degraded-mode path — works offline, works without auth.
3. **Backend write (best-effort):** calls `submitActivityToBackend(record)` which:
   - Forces a fresh ID token via `auth.currentUser?.getIdToken(true)` (Firebase JS SDK refreshes against its internal refresh token if needed). This avoids the silent 401-after-1-hour bug that would have happened if we trusted the captured `useAuth().token` state.
   - POSTs the record to `https://aipeer-api-596437694331.us-central1.run.app/activities/complete` with the fresh token in the Authorization header.
   - Logs failures (warns to console) but does NOT throw — the local write is the source of truth, the backend write is fire-and-forget. A network failure or backend outage degrades to local-only without user-visible errors.
4. The backend (`API/controllers/activitiesController.js`) reads `req.user.uid` from the auth middleware's verified token (NEVER from the request body), validates the schema, and writes to `users/{uid}/activities/{activityId}` in the `ai-peer` Firestore database. The doc id is the activity's own `id` field, so a retry with the same id is idempotent.
5. **Partial activities are NEVER persisted.** If the user starts a 3-set exercise and bails out after set 1, no record is written to either destination. `setsCompleted === setsTarget` is enforced at the call site in `exercise-session.tsx:handleSetComplete`.

### Activity record schema

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| id | string | client-generated | `${Date.now()}_${random6}` — used as Firestore doc id for idempotency |
| exerciseId | string | exercise rule | e.g. `strength-1`, `assessment-1` |
| exerciseName | string | exercise rule | display name |
| category | string | exercise rule | `warmup` / `strength` / `balance` / `assessment` / `other` |
| completedAt | string | Date.now() | ISO 8601 |
| repCount | number | accumulator | Legacy alias of totalReps. Kept so the existing activity tab UI (which filters by `repCount > 0`) keeps working without changes. |
| setsCompleted | number | accumulator | Always equals setsTarget when the record exists |
| setsTarget | number | exercise rule | Total sets the user attempted |
| durationSec | number | accumulator | Sum of per-set durations |
| totalReps | number | accumulator | Sum of all sets' rep counts |
| repsPerSet | number[] | accumulator | Reps per set in order |
| unilateral | boolean | exercise rule | true for L/R-split exercises |
| angleSummaries | AngleSummarySet[] | RepCounter | Per-set angle history with `setIndex`, `side` (`'left'`/`'right'`/`'both'`), per-rep `{startAngle, endAngle, peakAngle, romDeg, durationMs}`, and `bilateralAveraged?` flag. Empty for TUG (no reps). |
| feedbackEvents | FeedbackEvent[] | violation accumulator | Aggregated form-check violations: `{message, severity, count, firstAt, lastAt}` where firstAt/lastAt are ms-since-activity-start |
| avgScore | number \| null | scores accumulator | Mean per-frame form score (0-100). null if no frames |
| framesAnalyzed | number | scores accumulator | Total frames pose-analyzed across all sets |
| notes | string? | optional | Free-form note (e.g., assessment band labels) |

## Data Flow: Questionnaire to Firestore Activity Record

The FES-I (Falls Efficacy Scale – International) questionnaire is a 7-item instrument where each item is scored 1–4. The flow from user submission to Firestore is:

1. `app/questionnaire.tsx` collects answers and calls `submitQuestionnaireResult(result)` from `src/fra-storage.ts` (`src/fra-storage.ts:22`).
2. **Local write (always):** `submitQuestionnaireResult` immediately serializes the result (FES-I total, per-question answers, ISO timestamp) to AsyncStorage under key `fra_questionnaire_result_v1` (`src/fra-storage.ts:7,18-20`). This write runs unconditionally before any validation.
3. **Validation gate:** answers are valid only when all 7 questions are answered and every score is an integer in [1, 4] (`src/fra-storage.ts:27-31`). If validation fails, the function returns early and no activity record is submitted.
4. **Activity record construction:** when all 7 answers pass validation, `submitQuestionnaireResult` builds a questionnaire-shaped `ExerciseCompletionRecord` (`src/fra-storage.ts:34-53`):
   - `category: "assessment"`, `exerciseId: "fes_i_questionnaire"`
   - `fesI`: the computed total FES-I score
   - `questionnaireAnswers`: the full `Record<number, number>` answer map
   - `repCount`, `totalReps`, `durationSec` are all `0`; `setsCompleted` and `setsTarget` are both `1`
   - `id` is `fesi_${Date.now()}_${random6}` for idempotency
5. **Backend write (fire-and-forget):** `void submitActivityToBackend(record)` is called (`src/fra-storage.ts:55`), which forces a fresh Firebase ID token via `auth.currentUser?.getIdToken(true)` and POSTs the record to `POST /activities/complete` (`src/exercise-activity-storage.ts:256-293`).
6. **Backend persistence:** `API/controllers/activitiesController.js:submitActivity` reads `req.user.uid` from the verified token, validates required fields, and delegates to `activityService.writeUserActivity(userId, record)` (`API/controllers/activitiesController.js:50`).
7. **Firestore write:** `API/services/firestore-functions.js:writeUserActivity` extracts the `YYYY-MM-DD` date from `completedAt` and writes to `users/{uid}/activities/{YYYY-MM-DD}` with `{ merge: true }`, storing the record under `entries.<activityId>` (`API/services/firestore-functions.js:81-95`). A retry with the same `id` is idempotent because it overwrites the same map key.

```
app/questionnaire.tsx
        |
        v
src/fra-storage.ts:submitQuestionnaireResult
        |
        +---> AsyncStorage["fra_questionnaire_result_v1"]   (always, immediate)
        |
        +--[valid 7 answers, scores 1-4?]---> build ExerciseCompletionRecord
                                                    |
                                                    +---> submitActivityToBackend (fire-and-forget)
                                                                |
                                                         POST /activities/complete
                                                                |
                                                     activitiesController.submitActivity
                                                                |
                                                     firestore-functions.writeUserActivity
                                                                |
                                                    users/{uid}/activities/{YYYY-MM-DD}
                                                     entries.fesi_<timestamp>_<rand>
```

Note: the questionnaire record is **not** written to `AsyncStorage["exercise_activity_records_v1"]` — only the remote write path is used after the local `fra_questionnaire_result_v1` save. The questionnaire result is its own local key; the general activity history (`exercise_activity_records_v1`) holds exercise session records written by `submitCompletedActivity`.

## Data Flow: REDCap Sync

1. Firebase Cloud Function `redcapSync` runs daily at 2:00 AM Eastern via Cloud Scheduler.
2. Step 1 (Pull): Fetches all records from REDCap, matches to Firestore users by phone number. Updates `btrack_score` and `fear_falling_score` in Firestore ONLY if the existing value is null (never overwrites scores submitted through the app).
3. Step 2 (Push): Reads all Firestore users with non-null scores and pushes them to REDCap.
4. Field mapping is defined in `functions/config/fieldMappings.js`.
5. REDCap API credentials are stored in Firestore at `config/redcap` document (not in environment variables).
6. Timeout: 5 minutes. Retries: up to 3 times on failure.

## Firestore Schema

Database name: `ai-peer` (named database, not the default)

### Collection: users

| Field | Type | Description |
|-------|------|-------------|
| phoneNumber | string | Normalized digits only (no +1 prefix) |
| passwordHash | string | bcrypt hash (12 salt rounds) |
| phoneVerified | boolean | True after first successful SMS verification |
| createdAt | string | ISO 8601 timestamp |
| lastVerifiedAt | string | ISO 8601, updated on each SMS verify |
| btrack_score | number or null | BTrack balance score (from app or REDCap) |
| fear_falling_score | number or null | FES-I fear of falling score |
| compliance_days_active | number or null | Days with exercise activity |
| compliance_rate | number or null | Compliance percentage |
| updatedAt | string | ISO 8601, set by REDCap sync |

### Collection: verificationSessions

| Field | Type | Description |
|-------|------|-------------|
| phoneNumber | string | Normalized digits |
| sessionInfo | string | Identity Platform session token |
| mode | string | "login" or "create" |
| userId | string | Firestore user document ID |
| createdAt | Timestamp | Firebase server timestamp |
| expiresAt | Timestamp | 10 minutes after creation |

### Collection: refreshTokens

| Field | Type | Description |
|-------|------|-------------|
| token | string | crypto.randomUUID() |
| userId | string | Firestore user document ID |
| createdAt | Timestamp | Firebase server timestamp |
| expiresAt | Timestamp | 30 days after creation |

### Subcollection: users/{uid}/activities

Per-user exercise activity history. Doc id = the activity's own `id` field for idempotency. Written by `API/controllers/activitiesController.js:submitActivity` via the Admin SDK (which bypasses security rules — access control is enforced by reading `req.user.uid` from the verified Bearer token). Schema is documented above in **Data Flow: Activity Persistence**.

### Document: config/redcap

| Field | Type | Description |
|-------|------|-------------|
| apiToken | string | REDCap API authentication token |
| apiUrl | string | REDCap API endpoint URL |

## GCS Buckets

| Bucket | Contents | Access |
|--------|----------|--------|
| aipeer_videos | Exercise demonstration videos (24 videos across warmup, strength, balance, assessment categories) | Private. V4 signed URLs with 1-hour expiry. |
| qwenfinetune | Finetuned LLM model (Qwen3.5-2B-aipeer-Q4_K_M.gguf, ~1.2GB) finetuned on [YsK-dev/geriatric-health-advice](https://huggingface.co/datasets/YsK-dev/geriatric-health-advice) (Apache 2.0) | Private. V4 signed URLs with 1-hour expiry. Separate bucket env var (GCS_MODEL_BUCKET). |

## Key Design Decisions

1. **Bare React Native workflow** (not Expo managed) -- required because `llama.rn` and the custom MediaPipe native plugin need native module linking that Expo Go cannot provide.

2. **CPU-only LLM inference** (`n_gpu_layers=0`) -- ensures the model runs on any device regardless of GPU capabilities. The 2B Q4_K_M quant is efficient enough on modern iPhones for acceptable latency.

3. **IAM signBlob on Cloud Run** -- the service account private key never exists on the server. Cloud Run uses Application Default Credentials, and URL signing is done via the IAM signBlob API. Locally, the private key from `.env` is used directly.

4. **Named Firestore database** (`ai-peer`) -- not the default `(default)` database. Both the API (`config/firebaseConfig.js`) and Cloud Functions (`functions/index.js`) explicitly reference this.

5. **Separate GCS bucket for the model** -- `GCS_MODEL_BUCKET` (defaults to `qwenfinetune`) is independent from `GCS_BUCKET_NAME` (video bucket). This allows different access policies and lifecycle rules.

6. **24-hour conversation TTL** -- chat conversations auto-archive after 24 hours. This is a HIPAA measure to minimize stored PHI on the device.

7. **Phone number normalization** -- all non-digit characters are stripped. The raw digits are stored in Firestore. E.164 format (+1 prefix) is only added at the point of SMS delivery.

8. **Model version migration** -- when the app downloads a new model, it checks `OLD_MODEL_FILENAMES` in `config.ts` and deletes any previous model files to avoid wasting device storage.
