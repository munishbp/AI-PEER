# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next Steps (TODO)

1. **Set up Google Cloud Run deployment** - Deploy the backend API to Cloud Run, configure Secret Manager for GCS_PRIVATE_KEY, test production endpoints
2. **Implement on-device LLM** - Integrate Qwen3 (0.6B or 1.7B) using llama.rn in the Expo app for patient chatbot and response analysis

## Interaction Style

This is a learning project. Guide the user through understanding concepts rather than just providing answers. Ask questions, explain the "why", and help them arrive at solutions themselves. Only provide direct answers when:
- The user says they're in "crunch time" or it's an emergency
- The user explicitly asks for a direct answer

## Project Overview

AIPEER is a HIPAA-compliant mobile application for fall risk assessment and exercise interventions. It's a UCF Senior Design Project (2025-2026) built in collaboration with UCF's College of Medicine.

## Tech Stack

- **Backend**: Node.js + Express with Google Cloud Storage for HIPAA-compliant video delivery
- **Frontend**: React Native + Expo (managed workflow) with TypeScript
- **Video Delivery**: Time-limited signed URLs (1-hour expiration) from GCS

## Common Commands

### Backend (API/)
```bash
cd API
npm install          # Install dependencies
node server.js       # Start server (runs on port 3000)
```

Health check: `GET http://localhost:3000/health`

### Frontend (front-end/AI-PEER/)
```bash
cd front-end/AI-PEER
npm install          # Install dependencies
npx expo start       # Start Expo dev server
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
npm run lint         # Run ESLint
eas build --platform ios      # Production iOS build
eas build --platform android  # Production Android build
```

## Architecture

### Backend Structure
- `server.js` - Express entry point, registers routes and middleware (CORS, JSON parser, auth)
- `middleware/authMiddleware.js` - Verifies Firebase ID tokens, protects routes
- `services/Auth_Service.js` - Firebase Admin SDK integration for token verification
- `services/GCS_Service.js` - Generates signed URLs for GCS video files
- `routes/` - One file per video endpoint (copy `video_template.js` for new exercises)

**Pattern for adding new video endpoints:**
1. Copy `routes/video_template.js` to `routes/<exercise-name>.js`
2. Update `Vid_ID` and `Exercise_Name` constants
3. Register route in `server.js`: `app.get('/api/video/<name>', require('./routes/<name>'))`

### Frontend Structure (Expo Router)
- `app/_layout.tsx` - Root layout with theme provider and Stack navigator
- `app/(tabs)/` - Tab-based navigation (file-based routing)
  - `_layout.tsx` - Tab configuration with Home and Explore tabs
  - `index.tsx` - Home screen
  - `explore.tsx` - Explore screen
- `components/` - Reusable UI components (ThemedText, ThemedView, ParallaxScrollView, etc.)
- `hooks/` - Custom hooks (useColorScheme, useThemeColor)
- `constants/` - Theme colors and configuration

The frontend uses `@/` path alias for imports from project root.

## Environment Configuration

### Backend (.env in API/)
Required GCS credentials:
- `GCS_PROJECT_ID`
- `GCS_CLIENT_EMAIL`
- `GCS_PRIVATE_KEY`
- `GCS_BUCKET_NAME`
- `PORT` (default: 3000)

### Frontend
- `EXPO_PUBLIC_API_URL` - Backend API URL (e.g., `http://localhost:3000`)

## Security Notes

- Video URLs are signed with 1-hour expiration for HIPAA compliance
- Never commit `.env` files (use `.env.example` as template)
- All video content must be served through signed URLs, never public URLs
- Authentication uses Google Cloud Identity Platform (HIPAA BAA compliant)
- All protected routes require valid Firebase ID token in Authorization header

## Deployment (Cloud Run)

Cloud Run is the recommended deployment target - scales to zero, generous free tier, HIPAA BAA compliant.

### Prerequisites
1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project research-ai-peer-dev`

### Deploy Backend
```bash
cd API

# Build and deploy (Cloud Run builds from source)
gcloud run deploy aipeer-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCS_PROJECT_ID=xxx,GCS_CLIENT_EMAIL=xxx,GCS_BUCKET_NAME=xxx" \
  --set-secrets "GCS_PRIVATE_KEY=gcs-private-key:latest"
```

### Environment Variables in Production
- Set non-sensitive vars with `--set-env-vars`
- Store secrets in **Secret Manager** and reference with `--set-secrets`
- Never put private keys directly in deployment commands

### Dockerfile (if needed)
Cloud Run can build from source, but if you need a Dockerfile:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```
Note: Cloud Run uses port 8080 by default. Set `PORT=8080` or use `--port 3000` in deploy command.

## On-Device LLM (Qwen3 Thinking)

Local LLM inference for patient chatbot and response analysis using the phone's compute resources.

### Model Options
| Model | Size (Quantized) | Best For |
|-------|------------------|----------|
| Qwen3 0.6B | ~400MB | Older phones, faster responses |
| Qwen3 1.7B | ~1GB | Newer phones (iPhone 12+, recent Android) |
| Qwen3 4B | ~2.5GB | High-end devices only |

Recommendation: Start with 0.6B for broad compatibility, offer 1.7B as optional download for capable devices.

### Integration Approach
Use **llama.cpp** with React Native bindings to run GGUF quantized models on-device.

#### 1. Install llama.rn
```bash
cd front-end/AI-PEER
npm install llama.rn
```

#### 2. Get Quantized Models
Download GGUF models from Hugging Face:
- https://huggingface.co/Qwen (look for GGUF versions)
- Use Q4_K_M quantization for balance of quality/size

#### 3. Bundle or Download Models
Two strategies:
- **Bundle**: Include in app (increases app size significantly)
- **Download on first launch**: Better for app store size limits, show progress to user

#### 4. Basic Usage Pattern
```typescript
import { initLlama, createCompletion } from 'llama.rn';

// Initialize model (do once, store reference)
const context = await initLlama({
  model: 'path/to/qwen3-0.6b-q4_k_m.gguf',
  n_ctx: 2048,  // context window
  n_threads: 4, // CPU threads
});

// Generate response
const response = await createCompletion(context, {
  prompt: '<user message here>',
  n_predict: 256, // max tokens
  temperature: 0.7,
});
```

### Performance Considerations
- Run inference on background thread to avoid UI freezes
- Show typing indicator during generation
- Consider streaming tokens for better UX
- Test on older devices to ensure acceptable speed
- Monitor battery usage during extended conversations

### HIPAA Considerations
- On-device inference is privacy-friendly (no data leaves phone)
- No PHI sent to external LLM APIs
- Model weights don't contain patient data
