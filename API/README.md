# AI-PEER API

Express 5.1 backend deployed on Google Cloud Run. Handles authentication (phone + SMS 2FA), user management, exercise video delivery via signed URLs, LLM model distribution, and per-user exercise activity persistence to Firestore. All protected endpoints require a Firebase ID token as Bearer auth.

## Prerequisites

- Node.js >= 20
- Firebase project with Identity Platform enabled (for SMS 2FA)
- GCS buckets: `aipeer_videos` (exercise videos), `qwenfinetune` (LLM model)
- Service account with `iam.serviceAccounts.signBlob` permission (for Cloud Run signed URLs)

## Setup

```bash
cp .env.example .env    # Fill in your credentials
npm install
node server.js          # http://localhost:3000
```

Health check: `GET http://localhost:3000/health`

## Environment Variables

| Variable | Description |
|----------|-------------|
| GCS_PROJECT_ID | Google Cloud project ID (e.g., `research-ai-peer-dev`) |
| GCS_CLIENT_EMAIL | Service account email for GCS signing |
| GCS_PRIVATE_KEY | Service account private key (local dev only; Cloud Run uses ADC) |
| GCS_BUCKET_NAME | Video storage bucket (e.g., `aipeer_videos`) |
| GCS_MODEL_BUCKET | LLM model bucket (e.g., `qwenfinetune`). Defaults to `qwenfinetune` if unset. |
| IDENTITY_PLATFORM_API_KEY | Google Identity Platform API key for SMS 2FA |
| PORT | Server port (default: 3000) |
| NODE_ENV | `development` or `production` |

## Auth Model

`server.js` mounts routes in this order:

```
app.use('/auth', authRoutes)   // PUBLIC — no token required
app.use(verification)          // middleware: verifies Bearer token, attaches req.user
app.use('/video', videoRoutes) // protected
app.use('/model', modelRoutes) // protected
app.use('/users', userRoutes)  // protected
app.use('/activities', activitiesRoutes) // protected
```

Any route mounted **after** `app.use(verification)` requires `Authorization: Bearer <firebaseIdToken>`. The middleware (`middleware/authMiddleware.js`) calls `admin.auth().verifyIdToken(token)` and attaches the decoded token to `req.user`, so downstream controllers read `req.user.uid` directly without re-verifying or trusting body params.

**Public routes** (no token required): `/health`, `/auth/register`, `/auth/login`, `/auth/send-code`, `/auth/verify`, `/auth/refresh`.

**Protected route families**: `/video/*`, `/model/*`, `/users/*`, `/activities/*`.

Authorization gap to avoid: never read a user ID from the request body on protected routes. Any authenticated caller could pass another user's ID and read or write their data. Always use `req.user.uid` from the verified token. The activities controller demonstrates the correct pattern.

## Token-Freshness Note

Firebase ID tokens expire after approximately 1 hour. Clients must call `auth.currentUser?.getIdToken(true)` immediately before each authenticated POST to force a fresh token against Firebase's internal refresh token — do not rely on a token cached in component state, which silently expires and causes 401s.

Reference implementation: `front-end/AI-PEER/src/exercise-activity-storage.ts`, function `submitActivityToBackend`:

```typescript
const freshToken = await auth.currentUser?.getIdToken(true);
// then pass as Authorization: Bearer ${freshToken}
```

This is independent of the app's custom `/auth/refresh` cold-start path (which restores a session from AsyncStorage on app open). The two systems coexist without interfering.

## Error Response Shapes

All error responses follow a two-field JSON shape. The `error` field is a stable machine-readable label; `message` contains detail.

**400 — validation failure** (from `activitiesController.submitActivity`):

```json
{
  "error": "Invalid activity record",
  "message": "id is required (string)"
}
```

The `message` is the first failing field from `validateActivityRecord`. Other possible values: `"exerciseId is required"`, `"exerciseName is required"`, `"category is required"`, `"completedAt is required (ISO string)"`, `"setsCompleted is required (number)"`, `"setsTarget is required (number)"`, `"durationSec is required (number)"`, `"totalReps is required (number)"`, `"repsPerSet must be an array"`, `"unilateral must be a boolean"`.

**401 — missing or invalid Bearer token** (from `middleware/authMiddleware.js`):

```json
{
  "error": "Verification failed",
  "message": "Invalid or expired token"
}
```

Returned when no `Authorization` header is present or the token fails `admin.auth().verifyIdToken()`. The `message` is always `"Invalid or expired token"` (normalized in `Auth_Service.verification`).

**401 — token valid but `req.user` not populated** (from `activitiesController`):

```json
{
  "error": "Unauthorized",
  "message": "No verified user on request"
}
```

Defensive check inside the activities controller. Should not fire in normal operation if the middleware ran correctly.

**500 — internal error** (from `activitiesController.submitActivity`):

```json
{
  "error": "Failed to submit activity",
  "message": "<error.message>"
}
```

Other 500 shapes from `activitiesController.getActivities`: `"error": "Failed to fetch activities"`. From `videoController`: `"error": "Failed to retrieve video"`. From `modelController`: `"error": "Failed to retrieve model URL"`.

## Quick curl Examples

Replace `$TOKEN` with a valid Firebase ID token (obtain via `auth.currentUser?.getIdToken(true)` on the client, or via the Firebase REST API).

**POST /auth/register** (public):

```bash
curl -X POST https://aipeer-api-596437694331.us-central1.run.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "5551234567", "password": "secret123"}'
```

**POST /auth/verify** (public — exchange SMS code for tokens):

```bash
curl -X POST https://aipeer-api-596437694331.us-central1.run.app/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "5551234567", "code": "123456"}'
```

Response: `{ "success": true, "customToken": "...", "refreshToken": "...", "userId": "...", "isNewUser": false }`

**POST /auth/refresh** (public — exchange refresh token for new custom token):

```bash
curl -X POST https://aipeer-api-596437694331.us-central1.run.app/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<uuid-from-verify>"}'
```

Response: `{ "success": true, "customToken": "...", "userId": "..." }`

**GET /users/get** (authenticated):

```bash
curl "https://aipeer-api-596437694331.us-central1.run.app/users/get?id=<userId>" \
  -H "Authorization: Bearer $TOKEN"
```

**POST /activities/complete** (authenticated):

```bash
curl -X POST https://aipeer-api-596437694331.us-central1.run.app/activities/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1713398400000_abc123",
    "exerciseId": "strength-1",
    "exerciseName": "Knee Extensor",
    "category": "strength",
    "completedAt": "2026-04-17T12:00:00.000Z",
    "setsCompleted": 3,
    "setsTarget": 3,
    "durationSec": 180,
    "totalReps": 30,
    "repsPerSet": [10, 10, 10],
    "unilateral": true
  }'
```

Response (201): `{ "success": true, "activityId": "1713398400000_abc123" }`

**GET /activities/list** (authenticated):

```bash
curl https://aipeer-api-596437694331.us-central1.run.app/activities/list \
  -H "Authorization: Bearer $TOKEN"
```

Response: `{ "activities": [ ... ] }` ordered by `completedAt` desc.

**GET /video/getTugURL** (authenticated — returns signed GCS URL):

```bash
curl https://aipeer-api-596437694331.us-central1.run.app/video/getTugURL \
  -H "Authorization: Bearer $TOKEN"
```

Response: `{ "videoId": "Assessment Videos/Test1_Tug.mp4", "videoUrl": "https://storage.googleapis.com/...", "title": "Timed Up and Go", "duration": 120, "expiresIn": 3600 }`

**GET /model/getModelURL** (authenticated — returns signed LLM model URL):

```bash
curl https://aipeer-api-596437694331.us-central1.run.app/model/getModelURL \
  -H "Authorization: Bearer $TOKEN"
```

Response: `{ "modelUrl": "https://storage.googleapis.com/...", "filename": "Qwen3.5-2B-aipeer-Q4_K_M.gguf", "expiresIn": 3600 }`

## API Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check. Returns `{ status: "OK", message: "AI PEER API is running" }` |

### Auth Routes (/auth) -- no Bearer token required

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account. Body: `{ phone, password }`. Validates phone (10+ digits), password (6+ chars). Hashes with bcrypt (12 rounds). |
| POST | /auth/login | Validate credentials. Body: `{ phone, password }`. Returns `{ customToken }`. |
| POST | /auth/send-code | Send SMS verification code. Body: `{ phone, password, mode }`. Mode is "login" or "create". Rate limited: 60s cooldown, 5/hour per phone. |
| POST | /auth/verify | Verify SMS code. Body: `{ phone, code }`. Returns `{ customToken, refreshToken, userId, isNewUser }`. |
| POST | /auth/refresh | Exchange refresh token. Body: `{ refreshToken }`. Returns `{ customToken, userId }`. Tokens expire after 30 days. |

### Protected Routes (Bearer token required)

All routes below require `Authorization: Bearer <firebaseIdToken>` header.

#### User Routes (/users)

| Method | Path | Description |
|--------|------|-------------|
| POST | /users/register | Register user in Firestore |
| GET | /users/get?id=userId | Get user profile |
| POST | /users/update | Update user fields. Body: `{ id, ...fields }` |
| POST | /users/delete | Delete user. Body: `{ id }` |

#### Model Routes (/model)

| Method | Path | Description |
|--------|------|-------------|
| GET | /model/getModelURL | Get signed download URL for the finetuned LLM model (Qwen3.5-2B-aipeer-Q4_K_M.gguf, ~1.2GB). Returns `{ modelUrl, filename, expiresIn: 3600 }`. |

#### Activities Routes (/activities)

Per-user exercise activity history. Records are written to a Firestore subcollection at `users/{uid}/activities/{activityId}`. The user ID is read from the verified Bearer token (`req.user.uid`), never from request body or query — this prevents authenticated callers from writing to other users' histories.

| Method | Path | Description |
|--------|------|-------------|
| POST | /activities/complete | Write a completed activity to the caller's history. Body must conform to the schema below. Doc id is the activity's own `id` field, so a retry with the same id is idempotent. Returns `{ success: true, activityId }` on 201. Returns 400 on missing required fields, 401 on missing/invalid token. |
| GET | /activities/list | Return the caller's full activity history, ordered by `completedAt` desc. Returns `{ activities: [...] }`. Single-field orderBy — no composite index required. |

**Request body schema** (POST /activities/complete) — required fields validated by `controllers/activitiesController.js:validateActivityRecord`:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Client-generated unique identifier (e.g., `${Date.now()}_${random6}`). Used as the Firestore document id for idempotency. |
| exerciseId | string | Exercise rule id (e.g., `strength-1`, `assessment-1`). Maps to entries in `exerciseRegistry`. |
| exerciseName | string | Display name (e.g., `Knee Extensor`, `Chair Rise`). |
| category | string | One of `warmup`, `strength`, `balance`, `assessment`, `other`. |
| completedAt | string | ISO 8601 timestamp of when the activity finished. |
| setsCompleted | number | Always equals setsTarget when this record exists — partial activities are NEVER persisted. |
| setsTarget | number | Total sets the user attempted. |
| durationSec | number | Total session duration summed across all sets, rounded to seconds. |
| totalReps | number | Sum of reps across all sets. |
| repsPerSet | number[] | Reps in each set in order, e.g. `[10, 9, 10]`. |
| unilateral | boolean | True for L/R-split exercises (knee extensor, knee flexor, hip abductor). |

**Optional fields** (not validated, but written through if provided):

| Field | Type | Description |
|-------|------|-------------|
| angleSummaries | array | Per-set angle history from RepCounter: `[{setIndex, side: 'left'\|'right'\|'both', reps: [{startAngle, endAngle, peakAngle, romDeg, durationMs}], bilateralAveraged?}]`. |
| feedbackEvents | array | Aggregated form-check violations: `[{message, severity: 'mild'\|'moderate'\|'severe'\|'warning'\|'error', count, firstAt, lastAt}]`. firstAt/lastAt are ms-since-activity-start. |
| avgScore | number \| null | Mean form score across all frames analyzed in this activity (0-100). null if no frames. |
| framesAnalyzed | number | Total frames pose-analyzed across all sets. |
| notes | string | Optional free-form note (e.g., assessment band labels). |

#### Video Routes (/video)

Each endpoint returns `{ videoId, videoUrl, title, duration, expiresIn: 3600 }` where `videoUrl` is a 1-hour signed GCS URL.

| Method | Path | Video |
|--------|------|-------|
| GET | /video/getTugURL | Timed Up and Go |
| GET | /video/getCRiseURL | Chair Rise |
| GET | /video/getBalanceURL | **Deprecated:** 4-Stage Balance Test (UI route removed in commit `c0345ad2`; endpoint retained for now to avoid breaking older client builds). |
| GET | /video/getAnkleURL | Ankle Warm Up |
| GET | /video/getBackURL | Back Extension Warm Up |
| GET | /video/getHeadURL | Head Warm Up |
| GET | /video/getNeckURL | Neck Warm Up |
| GET | /video/getTrunkURL | Trunk Warm Up |
| GET | /video/getBWWalkURL | Backwards Walk |
| GET | /video/getHTStandURL | Heel-Toe Stand |
| GET | /video/getHTWalkURL | Heel-Toe Walk |
| GET | /video/getHTWalkBkwdURL | Heel-Toe Walk Backwards |
| GET | /video/getHWalkURL | Heel Walk |
| GET | /video/getKneeBendsURL | Knee Bends |
| GET | /video/getOLStandURL | One-Leg Stand |
| GET | /video/getSWWalkURL | Sideways Walk |
| GET | /video/getSitStandURL | Sit-to-Stand |
| GET | /video/getToeWalkURL | Toe Walk |
| GET | /video/getWalkTurnURL | Walk and Turn |
| GET | /video/getBackKneeURL | Back Knee Strengthening |
| GET | /video/getCalfRaisesURL | Calf Raises |
| GET | /video/getFrntKneeURL | Front Knee Strengthening |
| GET | /video/getSideHipURL | Side Hip Strengthening |
| GET | /video/getToeRaisesURL | Toe Raises |

## Deployment

```bash
cd API
gcloud run deploy aipeer-api \
  --source . \
  --region us-central1 \
  --no-invoker-iam-check \
  --service-account "<service-account-email>" \
  --set-env-vars "GCS_PROJECT_ID=research-ai-peer-dev,GCS_BUCKET_NAME=aipeer_videos,GCS_MODEL_BUCKET=qwenfinetune,GCS_CLIENT_EMAIL=<service-account-email>,IDENTITY_PLATFORM_API_KEY=..."
```

| Flag | Purpose |
|------|---------|
| --source . | Build from source using Cloud Build |
| --region us-central1 | Deploy region |
| --no-invoker-iam-check | Allow unauthenticated HTTP requests (app handles its own auth) |
| --service-account | Service account with Firestore, GCS, and signBlob permissions |
| --set-env-vars | Runtime environment configuration |

Production URL: `https://aipeer-api-596437694331.us-central1.run.app`

## Architecture Notes

- **Middleware order matters**: `/auth` routes are mounted before the verification middleware, so they are publicly accessible. All routes mounted after `app.use(verification)` require a Bearer token.
- **`req.user` injection**: The auth middleware (`middleware/authMiddleware.js`) verifies the Firebase ID token AND attaches the decoded token to `req.user` so downstream controllers can read `req.user.uid` directly. New controllers should ALWAYS use `req.user.uid` instead of trusting body params for the user identity — taking the user id from the body is a real authorization gap (any authenticated caller could pass another user's id and read their data). The activities controller demonstrates the correct pattern.
- **GCS signing**: On Cloud Run, `GCS_PRIVATE_KEY` is not set, so `GCS_Service` uses IAM `signBlob` to sign URLs remotely. Locally, the private key from `.env` is used directly.
- **Separate model bucket**: `modelController` reads from `GCS_MODEL_BUCKET` (defaults to `qwenfinetune`), while `videoController` reads from `GCS_BUCKET_NAME` (`aipeer_videos`). The `generateSignedUrl` function accepts an optional bucket override parameter.
- **Rate limiting**: SMS send-code has a 60-second cooldown and a 5-per-hour limit per phone number. Enforced via Firestore `verificationSessions` timestamps.
- **Refresh tokens**: Stored in the `refreshTokens` Firestore collection with a 30-day expiry. Exchanged via `/auth/refresh` for a new Firebase custom token. **Note** that the client also has a separate per-request token-freshness path: clients should call `auth.currentUser?.getIdToken(true)` (Firebase JS SDK) inline before making protected calls — this refreshes the ID token against Firebase's internal refresh token, independent of the app's `/auth/refresh` cold-start path. The two systems coexist orthogonally.
- **Activity persistence**: `users/{uid}/activities/{activityId}` is a Firestore subcollection. The Admin SDK bypasses security rules, so write/read access is gated entirely by the `req.user.uid` check in the activities controller. The query `orderBy('completedAt', 'desc')` is single-field — no composite index required.

## File Structure

```
API/
  server.js                       # Express entry point
  config/firebaseConfig.js        # Firebase Admin init (named 'ai-peer' database)
  middleware/authMiddleware.js    # Bearer token verification + req.user injection
  routes/
    authRoutes.js                 # /auth endpoints
    userRoutes.js                 # /users endpoints
    videosRoutes.js               # /video endpoints (23 active exercises + deprecated balance)
    modelRoutes.js                # /model endpoints
    activitiesRoutes.js           # /activities endpoints (POST /complete, GET /list)
  controllers/
    userController.js             # User CRUD handlers
    videoController.js            # Video signed URL handlers
    modelController.js            # LLM model signed URL handler
    activitiesController.js       # Activity record submission + retrieval (uses req.user.uid)
  services/
    Auth_Service.js               # Firebase tokens, Identity Platform SMS
    GCS_Service.js                # Signed URL generation
    firestore-functions.js        # Firestore CRUD helpers (users + activities subcollection)
```
