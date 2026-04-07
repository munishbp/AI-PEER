# Architecture

## System Overview

AI-PEER is a HIPAA-compliant mobile application for fall risk assessment and exercise intervention. The system has four components: a React Native mobile app (bare workflow with Expo libraries), an Express API on Cloud Run, Firebase services (Firestore, Auth, Cloud Functions), and Google Cloud Storage.

The core design principle is that all ML inference stays on-device. The LLM (Qwen3.5-0.8B) and pose estimation model (MediaPipe Pose Landmarker) both run locally on the phone. No patient conversation data or video frames leave the device.

## System Diagram

```
  Mobile Device                         Google Cloud (research-ai-peer-dev)
  +---------------------------+        +--------------------------------+
  | React Native App          |        | Cloud Run                      |
  |                           | HTTPS  |   aipeer-api (Express 5.1)     |
  |  Expo Router (screens)    |------->|   /auth   - SMS 2FA            |
  |  llama.rn (Qwen3.5-0.8B) |<-------|   /users  - CRUD               |
  |  MediaPipe Pose Landmarker |        |   /video  - signed URLs        |
  |  AsyncStorage (local)     |        |   /model  - LLM download URL   |
  +---------------------------+        +---------------+----------------+
                                                       |
                                       +---------------v----------------+
                                       | Firestore (database: ai-peer)  |
                                       |   users, verificationSessions, |
                                       |   refreshTokens, config/redcap |
                                       +---------------+----------------+
                                                       |
                              +------------------------+------------------------+
                              |                                                 |
              +---------------v----------------+        +-----------------------v----+
              | Cloud Functions                |        | GCS Buckets                |
              |   redcapSync (daily 2am EST)   |        |   aipeer_videos (exercise) |
              |   REDCap <-> Firestore sync    |        |   qwenfinetune (LLM model) |
              +--------------------------------+        +----------------------------+
```

## Authentication Flow

1. User enters phone number and password on the login screen.
2. App calls `POST /auth/send-code` with credentials and mode (login or create).
3. Backend validates credentials (bcrypt comparison for login, or creates new user for registration).
4. Backend calls Google Identity Platform to send an SMS with a 6-digit code.
5. Rate limiting enforced: 60-second cooldown between codes, max 5 per hour per phone.
6. User enters the SMS code. App calls `POST /auth/verify`.
7. Backend verifies code with Identity Platform, then generates a Firebase custom token and a refresh token (30-day expiry, stored in Firestore `refreshTokens` collection).
8. Client calls `signInWithCustomToken()` with the Firebase JS SDK and stores the refresh token in AsyncStorage.
9. On subsequent app launches, the client calls `POST /auth/refresh` with the stored refresh token to get a new custom token without re-entering credentials.
10. All protected API calls include the Firebase ID token as a Bearer token in the Authorization header.

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
3. The `modelController` generates a signed URL for `models/Qwen3.5-0.8B-aipeer-Q4_K_M.gguf` in the `qwenfinetune` bucket (separate from the video bucket via `GCS_MODEL_BUCKET` env var).
4. App downloads the ~505MB GGUF file to the device's document directory with progress tracking.
5. Old model files (e.g., `Qwen3-0.6B-Q4_K_M.gguf`) are automatically deleted during download.
6. `LLMService` singleton loads the model via `llama.rn` (4 CPU threads, 0 GPU layers for broad compatibility).
7. Inference uses Qwen ChatML format (`<|im_start|>` tokens) with the PEER framework system prompt.
8. The model runs in non-thinking mode (no `<think>` tags). Any residual thinking tags are stripped as a safety net.
9. Conversations persist in AsyncStorage and auto-archive after 24 hours.

## Data Flow: Pose Estimation

1. `VisionCamera` captures frames from the front-facing camera.
2. A custom native frame processor plugin (`PoseLandmarkerPlugin.swift` on iOS) receives each frame as a CMSampleBuffer.
3. Google MediaPipe Pose Landmarker runs on-device with GPU acceleration (Metal on iOS). The model file (`pose_landmarker_full.task`, ~9MB) is bundled in the app.
4. MediaPipe returns 33 3D landmarks (x, y, z, visibility) per detected person.
5. `VisionService.mapMediaPipeToPose()` maps the 33 MediaPipe landmarks to 17 COCO-compatible keypoints, applying coordinate rotation for the iOS front camera orientation.
6. `FormAnalyzer` checks the current pose against exercise-specific rules:
   - Angle checks (e.g., knee bend must be 160-180 degrees)
   - Alignment checks (e.g., spine must be vertical within tolerance)
   - Position checks (e.g., nose must be above hip)
   - Distance checks (e.g., feet separation)
7. `RepCounter` tracks repetition state machine: idle -> in_start -> in_end -> idle. Cooldown of 1.2 seconds between reps prevents double-counting. Supports angle, distance, and 3D angle measurement modes.
8. Form score is calculated from violation count. Score of 60+ = "good form".
9. All processing runs on-device. No frame data leaves the device.

> **Build dependency note:** The custom Swift plugin only compiles because `react-native-worklets-core` is declared as a direct npm dependency in `front-end/AI-PEER/package.json`. VisionCamera's frame processor support is gated on this package — without it, VisionCamera does not expose `FrameProcessorPlugin.h` and `PoseLandmarkerPlugin.swift` fails to compile.

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

### Document: config/redcap

| Field | Type | Description |
|-------|------|-------------|
| apiToken | string | REDCap API authentication token |
| apiUrl | string | REDCap API endpoint URL |

## GCS Buckets

| Bucket | Contents | Access |
|--------|----------|--------|
| aipeer_videos | Exercise demonstration videos (24 videos across warmup, strength, balance, assessment categories) | Private. V4 signed URLs with 1-hour expiry. |
| qwenfinetune | Finetuned LLM model (Qwen3.5-0.8B-aipeer-Q4_K_M.gguf, ~505MB) | Private. V4 signed URLs with 1-hour expiry. Separate bucket env var (GCS_MODEL_BUCKET). |

## Key Design Decisions

1. **Bare React Native workflow** (not Expo managed) -- required because `llama.rn` and the custom MediaPipe native plugin need native module linking that Expo Go cannot provide.

2. **CPU-only LLM inference** (`n_gpu_layers=0`) -- ensures the model runs on any device regardless of GPU capabilities. The 0.8B model is small enough for acceptable CPU performance.

3. **IAM signBlob on Cloud Run** -- the service account private key never exists on the server. Cloud Run uses Application Default Credentials, and URL signing is done via the IAM signBlob API. Locally, the private key from `.env` is used directly.

4. **Named Firestore database** (`ai-peer`) -- not the default `(default)` database. Both the API (`config/firebaseConfig.js`) and Cloud Functions (`functions/index.js`) explicitly reference this.

5. **Separate GCS bucket for the model** -- `GCS_MODEL_BUCKET` (defaults to `qwenfinetune`) is independent from `GCS_BUCKET_NAME` (video bucket). This allows different access policies and lifecycle rules.

6. **24-hour conversation TTL** -- chat conversations auto-archive after 24 hours. This is a HIPAA measure to minimize stored PHI on the device.

7. **Phone number normalization** -- all non-digit characters are stripped. The raw digits are stored in Firestore. E.164 format (+1 prefix) is only added at the point of SMS delivery.

8. **Model version migration** -- when the app downloads a new model, it checks `OLD_MODEL_FILENAMES` in `config.ts` and deletes any previous model files to avoid wasting device storage.
