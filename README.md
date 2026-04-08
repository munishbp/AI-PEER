# AIPEER - Fall Risk Assessment & Intervention App

UCF Senior Design Project 2025-2026. CS students collaborating with UCF College of Medicine to build a HIPAA-compliant mobile app that assesses fall risk and guides patients through exercise interventions using the Otago program.

## Project Structure

```
├── API/                         # Node.js backend (Cloud Run)
│   ├── server.js                # Express entry point
│   ├── routes/                  # Auth, user, video, & model endpoints
│   ├── services/                # GCS, Firebase, Auth services
│   ├── controllers/             # Request handlers (user, video, model)
│   ├── middleware/               # Firebase token verification
│   └── config/                  # Firebase Admin init
│
├── front-end/AI-PEER/           # React Native mobile app (Expo bare workflow)
│   ├── app/                     # Expo Router screens
│   │   ├── index.tsx            # Login/Register with SMS 2FA
│   │   ├── verify.tsx           # SMS code verification
│   │   ├── questionnaire.tsx    # Fall risk assessment
│   │   ├── chat-history.tsx     # Conversation list
│   │   └── (tabs)/             # Tab navigation
│   │       ├── index.tsx        # Home - FRA matrix, activity graphs
│   │       ├── ai-chat.tsx      # On-device LLM chat
│   │       ├── exercise.tsx     # Exercise category selector
│   │       ├── exercise-session.tsx  # Full-screen exercise session
│   │       ├── activity.tsx     # Activity tracking
│   │       ├── contacts.tsx     # Emergency contacts
│   │       └── settings.tsx     # User preferences
│   ├── src/
│   │   ├── auth/                # Firebase auth context
│   │   ├── llm/                 # On-device LLM module (llama.rn)
│   │   └── vision/              # MediaPipe Pose Landmarker
│   │       ├── VisionService.ts # MediaPipe landmark → COCO keypoint mapper
│   │       ├── VisionContext.tsx # React Context provider
│   │       ├── FormAnalyzer.ts  # Joint angle calculation + rule matching
│   │       ├── frameProcessor.ts # Camera frame processing
│   │       ├── exercises/       # Per-exercise form rules
│   │       └── components/      # Skeleton + guide overlays
│   ├── components/              # Reusable UI components
│   └── android/                 # Native Android project
│
├── functions/                   # Firebase Cloud Functions
│   ├── index.js                 # Function entry point (REDCap sync)
│   └── services/
│       └── REDCap_Service.js    # REDCap API wrapper
│
├── Training/                    # ML model training
│   ├── slm/                     # SLM empathy training pipeline
│   └── yolo/                    # Legacy YOLO pose model training (replaced by MediaPipe)
│
├── firebase.json                # Firebase project config
└── .firebaserc                  # Firebase project aliases
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
npm run android         # Build and run on Android
npm run ios             # Build and run on iOS
```

> **Note:** This is a bare workflow project (ejected for llama.rn). You can't use Expo Go - you must build the native app.

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
- SMS 2FA authentication via Identity Platform
- On-device AI chat (Qwen3.5-2B finetuned on [YsK-dev/geriatric-health-advice](https://huggingface.co/datasets/YsK-dev/geriatric-health-advice) (Apache 2.0), via llama.rn) - all processing stays on phone
- Conversation history with 24-hour auto-archive
- Secure video delivery with signed URLs (1-hour expiration)
- Activity tracking and weekly summaries
- Accessibility preferences (font scaling, high contrast)
- Cloud Run deployment with SignBlob URL signing
- MediaPipe Pose Landmarker real-time pose estimation for exercise form monitoring
- 24 exercises with real-time pose-based form analysis (3 assessment, 5 warmup, 5 strength, 11 balance)
- Exercise recommendation system with compliance tracking
- REDCap integration for clinical data sync (Firebase Cloud Function)

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
- Munish Persaud - https://www.linkedin.com/in/munish-persaud

UCF Senior Design 2025-2026 | Computer Science | UCF College of Medicine

## Documentation

- [Architecture](ARCHITECTURE.md) -- system diagram, data flows, Firestore schema, design decisions
- [File Map](FILE_MAP.md) -- complete source file listing with descriptions
- [API Reference](API/README.md) -- endpoints, environment variables, deployment
- [Frontend](front-end/AI-PEER/README.md) -- setup, features, project structure
- [Cloud Functions](functions/README.md) -- REDCap sync schedule, logic, field mapping
- [Training Pipeline](Training/slm/EMPATHY_TRAINING_PIPELINE.md) -- LLM finetuning methodology
