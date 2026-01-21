# AIPEER - Fall Risk Assessment & Intervention App

UCF Senior Design Project 2025-2026. CS students collaborating with UCF College of Medicine to build an app that assesses fall risk and guides patients through the PEER intervention method.

## Project Structure

```
AIPEER/
├── front-end/AI-PEER/    # React Native mobile app (bare workflow)
│   ├── app/              # Expo Router screens
│   ├── src/llm/          # On-device LLM module
│   ├── components/       # Reusable UI components
│   └── android/          # Native Android project
│
└── API/                  # Backend video API
    ├── server.js         # Express server
    ├── routes/           # Video endpoints
    └── services/         # GCS integration
```

## Quick Start

### Backend

```bash
cd API
npm install
cp .env.example .env    # Add your GCS credentials
node server.js          # Runs on localhost:3000
```

### Frontend

```bash
cd front-end/AI-PEER
npm install
npx expo start          # Start Metro bundler
npx expo run:android    # Build and run (or use Android Studio)
```

Note: This is a bare workflow project. Expo Go will not work due to native modules.

## Features

**Implemented:**
- Fall risk assessment with FRA matrix visualization
- On-device AI chat (Qwen3-0.6B via llama.rn)
- Conversation history with 24-hour auto-archive
- Secure video delivery with signed URLs (1-hour expiration)
- Activity tracking and weekly summaries

**In Progress:**
- Cloud Run deployment (blocked on IAM permissions)
- YOLOv26n pose estimation for exercise form monitoring

## Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native, Expo (bare workflow), TypeScript |
| On-Device LLM | llama.rn, Qwen3-0.6B |
| Backend | Node.js, Express |
| Video Storage | Google Cloud Storage |
| Auth | Firebase/Google Cloud Identity Platform |

## Security & HIPAA Compliance

- All LLM inference runs on-device (no patient data sent to external APIs)
- Videos served via time-limited signed URLs
- Conversations auto-delete after 24 hours
- Environment variables for credential management
- HTTPS required in production

## Environment Variables

**Backend (API/.env):**
```
GCS_PROJECT_ID=your-project-id
GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY=your-private-key
GCS_BUCKET_NAME=your-bucket-name
PORT=3000
```

**Frontend (.env):**
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Testing

```bash
# Backend health check
curl http://localhost:3000/health

# Frontend lint
cd front-end/AI-PEER && npm run lint
```

## Team

- Arthur Lookshin
- Beile Han
- Pramodh Miryala
- Santiago Echeverry
- Munish Persaud

UCF Senior Design 2025-2026 | Computer Science | UCF College of Medicine

## Documentation

- [API Documentation](./API/README.md)
