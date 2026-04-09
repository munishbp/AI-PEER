# AIPEER - Fall Risk Assessment & Intervention App

UCF Senior Design Project 2025-2026. CS students collaborating with UCF College of Medicine to build a HIPAA-compliant mobile app that assesses fall risk and guides patients through exercise interventions using the Otago program.

## Project Structure

```
├── API/                            # Node.js backend (Cloud Run)
│   ├── server.js                   # Express entry point
│   ├── routes/                     # Auth, user, video, model, & activities endpoints
│   ├── services/                   # GCS, Firebase Admin, Auth services
│   ├── controllers/                # Request handlers (user, video, model, activities)
│   ├── middleware/                 # Firebase token verification (attaches req.user)
│   └── config/                     # Firebase Admin init
│
├── front-end/AI-PEER/              # React Native mobile app (Expo bare workflow)
│   ├── app/                        # Expo Router screens
│   │   ├── index.tsx               # Login/Register with SMS 2FA
│   │   ├── verify.tsx              # SMS code verification
│   │   ├── questionnaire.tsx       # FES-I fall risk questionnaire
│   │   ├── chat-history.tsx        # Conversation list
│   │   └── (tabs)/                 # Tab navigation
│   │       ├── index.tsx           # Home - FRA matrix, activity graphs
│   │       ├── ai-chat.tsx         # On-device LLM chat
│   │       ├── exercise.tsx        # Exercise category selector
│   │       ├── exercise-session.tsx    # Multi-set exercise w/ camera, gesture-confirm start, rep counter
│   │       ├── balance-test.tsx    # Fall-risk balance assessments landing page
│   │       ├── chair-rise-test.tsx # 30-second sit-to-stand assessment
│   │       ├── tug-test.tsx        # Timed Up and Go assessment
│   │       ├── activity.tsx        # Activity tracking
│   │       ├── contacts.tsx        # Emergency contacts
│   │       └── settings.tsx        # User preferences
│   ├── src/
│   │   ├── auth/                   # Firebase auth context (two-token persistence)
│   │   ├── llm/                    # On-device LLM module (llama.rn)
│   │   ├── exercise-activity-storage.ts  # Local + backend activity persistence
│   │   └── vision/                 # MediaPipe Pose + Hand Landmarker pipeline
│   │       ├── VisionService.ts    # MediaPipe → COCO keypoint mapper, hand mapper
│   │       ├── VisionContext.tsx   # React Context, trackingMode state machine, open-palm detector
│   │       ├── FormAnalyzer.ts     # Per-frame check loop with rep-zone gating
│   │       ├── RepCounter.ts       # Rep state machine + per-rep angle history
│   │       ├── frameProcessor.ts   # VisionCamera worklet bridge to native plugin
│   │       ├── exercises/          # Per-exercise form rules
│   │       └── components/         # Skeleton + guide overlays
│   ├── components/                 # Reusable UI (incl. GestureCountdownOverlay)
│   ├── ios/AIPEER/                 # Swift PoseLandmarkerPlugin (Pose + Hand) + .task models
│   ├── android/app/...             # Kotlin PoseLandmarkerFrameProcessorPlugin + .task models
│   └── scripts/                    # ios-doctor, ios-clean, android-doctor, android-clean
│
├── functions/                      # Firebase Cloud Functions
│   ├── index.js                    # Function entry point (REDCap sync)
│   └── services/
│       └── REDCap_Service.js       # REDCap API wrapper
│
├── Training/                       # ML model training
│   ├── slm/                        # SLM empathy training pipeline
│   └── yolo/                       # Legacy YOLO pose model training (replaced by MediaPipe)
│
├── firebase.json                   # Firebase project config
└── .firebaserc                     # Firebase project aliases
```

## Quick Start

### Backend

```bash
cd API
npm install
cp .env.example .env    # Add your credentials
node server.js          # Runs on localhost:3000
```

Health check: `GET http://localhost:3000/health`

### Frontend

```bash
cd front-end/AI-PEER
npm install
cd ios && pod install && cd ..
npm run ios:doctor       # Verify iOS environment is healthy
npm run android:doctor   # Verify Android environment is healthy
npm run ios              # Open Xcode workspace, then Cmd+R to build & run
npm run android          # Build and run on Android
```

> **Note:** This is a bare workflow project (ejected for llama.rn). You can't use Expo Go — you must build the native app.

### Build troubleshooting

If a build fails or behaves oddly, run the doctor for the affected platform first. Both are read-only diagnostics that print PASS/FAIL for every required piece of the environment:

```bash
npm run ios:doctor      # iOS preflight (Xcode, CLT, CocoaPods, Pods, .env, worklets-core)
npm run android:doctor  # Android preflight (JDK, SDK, Gradle, env, props)
```

If doctor passes but the build still fails, the clean scripts nuke caches and rebuild from scratch (use sparingly — they touch shared caches):

```bash
npm run ios:clean       # Pod deintegrate + reinstall, wipe DerivedData
npm run android:clean   # Gradle clean + wipe build/, .gradle/, daemons
```

Full troubleshooting documentation (including the C++20 / Clang module cache story for iOS and the Gradle Worker Daemon failure mode for Android) lives in [`front-end/AI-PEER/README.md`](front-end/AI-PEER/README.md#ios-troubleshooting).

### Deploy to Cloud Run

API is deployed manually:

```bash
cd API
gcloud run deploy aipeer-api --source . --region us-central1 --no-invoker-iam-check \
  --service-account "munish@research-ai-peer-dev.iam.gserviceaccount.com" \
  --set-env-vars "GCS_PROJECT_ID=...,GCS_BUCKET_NAME=...,GCS_CLIENT_EMAIL=...,IDENTITY_PLATFORM_API_KEY=..."
```

**Production URL:** `https://aipeer-api-596437694331.us-central1.run.app`

## Features

**Implemented:**
- Fall risk assessment with FRA matrix visualization
- SMS 2FA authentication via Identity Platform with two-token persistence (refresh token in AsyncStorage → custom token → ID token)
- On-device AI chat (Qwen3.5-2B finetuned on [YsK-dev/geriatric-health-advice](https://huggingface.co/datasets/YsK-dev/geriatric-health-advice) (Apache 2.0), via llama.rn) — all processing stays on phone
- Conversation history with 24-hour auto-archive
- Secure video delivery with signed URLs (1-hour expiration)
- Per-user exercise activity persistence to Firestore (`users/{uid}/activities/{activityId}` subcollection) with automatic ID-token refresh
- Activity tracking and weekly summaries
- Accessibility preferences (font scaling, high contrast)
- Cloud Run deployment with IAM signBlob URL signing
- MediaPipe Pose + Hand Landmarker dual-task pipeline for real-time exercise form monitoring AND open-palm gesture-confirm start flow
- Per-rep angle history capture and form-check feedback events with timestamps + severity gradation
- 23 exercises with real-time pose-based form analysis (2 assessment, 5 warmup, 5 strength, 11 balance) — Chair Rise and TUG are the two clinical fall-risk assessments
- Exercise recommendation system with compliance tracking
- REDCap integration for clinical data sync (Firebase Cloud Function)
- Cross-platform native plugins: Swift on iOS (Metal GPU) + Kotlin on Android (GPU→CPU fallback)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native, Expo bare workflow, TypeScript |
| On-Device LLM | llama.rn, Qwen3.5-2B-aipeer-Q4_K_M (finetuned, ~1.2GB) |
| Pose Estimation | MediaPipe Pose Landmarker (on-device, GPU-accelerated) |
| Backend | Node.js, Express, Cloud Run |
| Cloud Functions | Firebase Functions (REDCap sync) |
| Database | Firestore |
| Video Storage | Google Cloud Storage (signed URLs) |
| Auth | Firebase + Identity Platform (SMS 2FA) |

## Security & HIPAA Compliance

- All LLM inference runs on-device (no patient data sent to external APIs)
- Pose estimation runs on-device via MediaPipe (no video leaves the phone)
- Videos served via time-limited signed URLs (1-hour expiration)
- SMS 2FA required for all logins
- Conversations auto-delete after 24 hours
- SignBlob for URL signing (private keys never leave Google infrastructure)
- Audit logs mask PHI (phone numbers logged as XXXX7739)
- Environment variables for all credentials

## Team

- Arthur Lookshin - https://www.linkedin.com/in/arthur-lookshin-54ba951b5/
- Beile Han
- Pramodh Miryala - https://www.linkedin.com/in/pramodh-miryala-82ab28292/
- Santiago Echeverry
- Munish Persaud - https://munishbp.com

UCF Senior Design 2025-2026 | Computer Science | UCF College of Medicine

## Documentation

- [Architecture](ARCHITECTURE.md) -- system diagram, data flows, Firestore schema, design decisions
- [File Map](FILE_MAP.md) -- complete source file listing with descriptions
- [API Reference](API/README.md) -- endpoints, environment variables, deployment
- [Frontend](front-end/AI-PEER/README.md) -- setup, features, project structure
- [Cloud Functions](functions/README.md) -- REDCap sync schedule, logic, field mapping
- [Training Pipeline](Training/slm/TRAINING_PLAN.md) -- LLM finetuning methodology, dataset, hardware setup, run stats
