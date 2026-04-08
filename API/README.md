# AI-PEER API

Express 5.1 backend deployed on Google Cloud Run. Handles authentication (phone + SMS 2FA), user management, exercise video delivery via signed URLs, and LLM model distribution. All protected endpoints require a Firebase ID token as Bearer auth.

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

#### Video Routes (/video)

Each endpoint returns `{ videoId, videoUrl, title, duration, expiresIn: 3600 }` where `videoUrl` is a 1-hour signed GCS URL.

| Method | Path | Video |
|--------|------|-------|
| GET | /video/getTugURL | Timed Up and Go |
| GET | /video/getCRiseURL | Chair Rise |
| GET | /video/getBalanceURL | 4-Stage Balance Test |
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
  --service-account "munish@research-ai-peer-dev.iam.gserviceaccount.com" \
  --set-env-vars "GCS_PROJECT_ID=research-ai-peer-dev,GCS_BUCKET_NAME=aipeer_videos,GCS_MODEL_BUCKET=qwenfinetune,GCS_CLIENT_EMAIL=munish@research-ai-peer-dev.iam.gserviceaccount.com,IDENTITY_PLATFORM_API_KEY=..."
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
- **GCS signing**: On Cloud Run, `GCS_PRIVATE_KEY` is not set, so `GCS_Service` uses IAM `signBlob` to sign URLs remotely. Locally, the private key from `.env` is used directly.
- **Separate model bucket**: `modelController` reads from `GCS_MODEL_BUCKET` (defaults to `qwenfinetune`), while `videoController` reads from `GCS_BUCKET_NAME` (`aipeer_videos`). The `generateSignedUrl` function accepts an optional bucket override parameter.
- **Rate limiting**: SMS send-code has a 60-second cooldown and a 5-per-hour limit per phone number. Enforced via Firestore `verificationSessions` timestamps.
- **Refresh tokens**: Stored in the `refreshTokens` Firestore collection with a 30-day expiry. Exchanged via `/auth/refresh` for a new Firebase custom token.

## File Structure

```
API/
  server.js                    # Express entry point
  config/firebaseConfig.js     # Firebase Admin init
  middleware/authMiddleware.js  # Bearer token verification
  routes/
    authRoutes.js              # /auth endpoints
    userRoutes.js              # /users endpoints
    videosRoutes.js            # /video endpoints (24 exercises)
    modelRoutes.js             # /model endpoints
  controllers/
    userController.js          # User CRUD handlers
    videoController.js         # Video signed URL handlers
    modelController.js         # LLM model signed URL handler
  services/
    Auth_Service.js            # Firebase tokens, Identity Platform SMS
    GCS_Service.js             # Signed URL generation
    firestore-functions.js     # Firestore CRUD helpers
```
