# AIPEER - Fall Risk Assessment & Intervention App

UCF Senior Design Project 2025-2026. CS students collaborating with UCF College of Medicine to build a HIPAA-compliant mobile app that assesses fall risk and guides patients through exercise interventions using the Otago program.

## Project Structure

```
├── .github/workflows/           # CI/CD pipelines
│   ├── api-ci.yml               # PR checks: npm audit, smoke test, Docker build
│   ├── api-deploy.yml           # Auto-deploy API to Cloud Run on merge
│   └── frontend-ci.yml          # PR checks: TypeScript, ESLint
│
├── API/                         # Node.js backend (Cloud Run)
│   ├── server.js                # Express entry point
│   ├── routes/                  # Auth, user, & video endpoints
│   ├── services/                # GCS, Firebase, Auth services
│   ├── controllers/             # Request handlers
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
│   │   └── vision/              # YOLOv26n pose estimation
│   │       ├── VisionService.ts # TFLite inference singleton
│   │       ├── VisionContext.tsx # React Context provider
│   │       ├── FormAnalyzer.ts  # Joint angle calculation + rule matching
│   │       ├── frameProcessor.ts # Camera frame processing
│   │       ├── exercises/       # Per-exercise form rules
│   │       └── models/          # TFLite model files
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
│   └── yolo/                    # YOLOv26n pose model training
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

Deployments are automated via GitHub Actions on merge to `main` (see CI/CD below). To deploy manually:

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
- On-device AI chat (Qwen3-0.6B via llama.rn) - all processing stays on phone
- Conversation history with 24-hour auto-archive
- Secure video delivery with signed URLs (1-hour expiration)
- Activity tracking and weekly summaries
- Accessibility preferences (font scaling, high contrast)
- Cloud Run deployment with SignBlob URL signing
- YOLOv26n real-time pose estimation for exercise form monitoring
- REDCap integration for clinical data sync (Firebase Cloud Function)
- CI/CD pipelines (GitHub Actions)

**In Progress:**
- Firebase auth persistence across app restarts

## Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native, Expo bare workflow, TypeScript |
| On-Device LLM | llama.rn, Qwen3-0.6B-Q4_K_M |
| Pose Estimation | YOLOv26n via TFLite (on-device) |
| Backend | Node.js, Express, Cloud Run |
| Cloud Functions | Firebase Functions (REDCap sync) |
| Database | Firestore |
| Video Storage | Google Cloud Storage (signed URLs) |
| Auth | Firebase + Identity Platform (SMS 2FA) |
| CI/CD | GitHub Actions |

## CI/CD

Three GitHub Actions workflows automate testing and deployment:

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `api-ci.yml` | PR to `main` touching `API/**` | npm audit, smoke test `/health`, Docker build |
| `api-deploy.yml` | Push to `main` touching `API/**` | Deploy to Cloud Run, verify health endpoint |
| `frontend-ci.yml` | PR to `main` touching `front-end/**` | TypeScript type check, ESLint |

See the [CI/CD setup guide](https://github.com/munishbp/AI-PEER/wiki) or ask the team for GitHub Secrets configuration.

## Security & HIPAA Compliance

- All LLM inference runs on-device (no patient data sent to external APIs)
- Pose estimation runs on-device via TFLite (no video leaves the phone)
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
