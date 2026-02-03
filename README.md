# AIPEER - Fall Risk Assessment & Intervention App

UCF Senior Design Project 2025-2026. CS students collaborating with UCF College of Medicine to build a HIPAA-compliant app that assesses fall risk and guides patients through the PEER intervention method.

## Project Structure

```
AIPEER/
├── front-end/AI-PEER/    # React Native mobile app (bare workflow)
│   ├── app/              # Expo Router screens
│   ├── src/
│   │   ├── llm/          # On-device LLM module
│   │   └── auth/         # Firebase auth context
│   ├── components/       # Reusable UI components
│   └── android/          # Native Android project
│
└── API/                  # Node.js backend (Cloud Run)
    ├── server.js         # Express entry point
    ├── routes/           # Auth & video endpoints
    ├── services/         # GCS, Firebase, Auth services
    └── middleware/       # Token verification
```

## Quick Start

### Backend

```bash
cd API
npm install
cp .env.example .env    # Add your credentials
node server.js          # Runs on localhost:3000
```

### Frontend

```bash
cd front-end/AI-PEER
npm install
npm run android         # Build and run on Android
npm run ios             # Build and run on iOS
```

> **Note:** This is a bare workflow project (ejected for llama.rn). You can't use Expo Go - you need to build the native app.

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

**In Progress:**
- YOLOv26n pose estimation for exercise form monitoring
- REDCap integration for clinical data sync
- Firebase auth persistence across app restarts

## Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native, Expo bare workflow, TypeScript |
| On-Device LLM | llama.rn, Qwen3-0.6B-Q4_K_M |
| Backend | Node.js, Express, Cloud Run |
| Database | Firestore |
| Video Storage | Google Cloud Storage (signed URLs) |
| Auth | Firebase + Identity Platform (SMS 2FA) |

## Security & HIPAA Compliance

- All LLM inference runs on-device (no patient data sent to external APIs)
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
