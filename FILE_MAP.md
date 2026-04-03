# File Map

Complete source file listing for the AI-PEER repository. UCF Senior Design 2025-2026.

## API/ -- Express Backend (Cloud Run)

| File | Purpose |
|------|---------|
| server.js | Express entry point. Mounts routes, applies CORS, JSON parsing, auth middleware. |
| .env.example | Template for GCS, Identity Platform, and server configuration. |
| config/firebaseConfig.js | Firebase Admin SDK initialization. Uses env vars locally, ADC on Cloud Run. |
| middleware/authMiddleware.js | Verifies Firebase ID token from Authorization Bearer header. |
| routes/authRoutes.js | /auth -- register, login, send-code (SMS 2FA), verify, refresh. |
| routes/userRoutes.js | /users -- register, get, update, delete. |
| routes/videosRoutes.js | /video -- 24 exercise video signed URL endpoints. |
| routes/modelRoutes.js | /model -- GET /getModelURL for LLM GGUF download. |
| controllers/userController.js | User CRUD request handlers. |
| controllers/videoController.js | Per-exercise signed URL generation (24 exercises). |
| controllers/modelController.js | Signed URL for Qwen3.5-0.8B GGUF in qwenfinetune bucket. |
| services/Auth_Service.js | Firebase custom token creation, Identity Platform SMS send/verify. |
| services/GCS_Service.js | V4 signed URL generation. Supports override bucket param. Uses IAM signBlob on Cloud Run. |
| services/firestore-functions.js | Firestore CRUD helpers for users collection. |

## front-end/AI-PEER/ -- React Native Mobile App

### Screens (app/)

| File | Purpose |
|------|---------|
| _layout.tsx | Root layout. Wraps app in AuthProvider, LLMProvider, VisionProvider, PrefsProvider. |
| index.tsx | Login/Register screen. Phone + password input, routes to verify. |
| verify.tsx | SMS 6-digit code verification screen. |
| welcome.tsx | Post-registration accessibility onboarding. |
| tutorial.tsx | App tutorial walkthrough after first login. |
| questionnaire.tsx | FES-I fall risk questionnaire (16 questions). |
| chat-history.tsx | Conversation history list with 24-hour auto-archive. |
| (tabs)/_layout.tsx | Bottom tab navigator (Home, AI Chat, Activity, Contacts, Settings). |
| (tabs)/index.tsx | Home tab. FRA matrix card, BTrack score, activity summary. |
| (tabs)/ai-chat.tsx | AI chat interface. Model download modal on first use, message input, typing indicator. |
| (tabs)/exercise.tsx | Exercise category selector (warmup, strength, balance, assessment). |
| (tabs)/exercise-session.tsx | Full-screen exercise session with camera, skeleton overlay, form feedback, rep counter. |
| (tabs)/activity.tsx | Activity tracking. Today's progress, weekly breakdown, monthly compliance heatmap. |
| (tabs)/balance-test.tsx | Balance assessment test screen (Timed Up and Go). |
| (tabs)/video-confirm.tsx | Video playback confirmation before starting exercise. |
| (tabs)/contacts.tsx | Emergency contacts management (Firestore-backed). |
| (tabs)/settings.tsx | User preferences (font scaling, high contrast, logout). |

### Core Modules (src/)

| File | Purpose |
|------|---------|
| api.ts | HTTP client. requestJSON helper, all API endpoint definitions (auth, users, model, video). |
| firebaseClient.ts | Firebase client SDK initialization (Auth + Firestore). |
| firebaseConfig.example.ts | Template for Firebase client config values. |
| video.ts | Exercise ID to video endpoint mapping + fetchVideoUrl() helper. |
| daily-workout.ts | Daily workout recommendation logic based on user progress. |
| workout-combos.ts | Predefined exercise combinations by category and difficulty. |
| exercise-activity-storage.ts | AsyncStorage persistence for exercise completion records. |
| fra-storage.ts | AsyncStorage persistence for FES-I questionnaire results. |
| prefs-context.tsx | React Context for accessibility preferences (font scale, contrast). |
| theme.ts | App-wide color palette, typography, and spacing constants. |

### Auth Module (src/auth/)

| File | Purpose |
|------|---------|
| AuthContext.tsx | React Context provider. Login, register, logout, refresh token persistence via AsyncStorage. |
| index.ts | Barrel export for AuthProvider and useAuth hook. |

### LLM Module (src/llm/)

| File | Purpose |
|------|---------|
| LLMService.ts | Singleton llama.rn wrapper. Loads model, runs inference, releases memory. |
| LLMContext.tsx | React Context for LLM state (download progress, model loaded, generating). Uses auth token for model download. |
| modelDownloader.ts | Fetches signed URL from API, downloads GGUF with progress tracking, cleans up old model files. |
| config.ts | Model filename, expected size (505MB), inference params (512 tokens, temp 0.7, top_p 0.9, ctx 8192). |
| systemPrompt.ts | PEER framework system prompt + ChatML prompt formatting function. |
| types.ts | ChatMessage, Conversation, LLMState, InferenceConfig type definitions. |
| useLLM.ts | React hook exposing LLM state and actions (send, downloadAndInit, clear). |
| index.ts | Barrel export for LLMProvider, useLLM, config values, downloader functions. |

### Vision Module (src/vision/)

| File | Purpose |
|------|---------|
| VisionService.ts | Parses YOLOv26n TFLite output into Pose keypoints. Runs as worklet. Handles iOS X/Y swap. |
| VisionContext.tsx | React Context for vision state, form analysis results, rep counting. |
| FormAnalyzer.ts | Evaluates current pose against exercise rules (angle, alignment, position, distance checks). |
| RepCounter.ts | State machine for counting reps (idle -> in_start -> in_end). 1.2s cooldown. |
| PoseSmoothing.ts | Temporal smoothing filter to reduce keypoint jitter across frames. |
| frameProcessor.ts | VisionCamera frame processor bridge. Resizes frame, runs TFLite, parses pose. |
| config.ts | YOLO model config: 640x640 input, 0.3 confidence threshold, model file path. |
| constants.ts | COCO keypoint names (17 points), skeleton connection pairs. |
| types.ts | Keypoint, Pose, FormViolation, FormFeedback, ExerciseState type definitions. |
| useVision.ts | React hook for components to access vision state and controls. |
| index.ts | Barrel export for VisionProvider, useVision. |

### Exercise Rules (src/vision/exercises/)

| File | Purpose |
|------|---------|
| types.ts | ExerciseRule, AngleCheck, AlignmentCheck, PositionCheck, DistanceCheck interfaces. |
| utils.ts | Angle calculation between 3 keypoints, alignment and distance helpers. |
| index.ts | Exercise registry. Maps exercise IDs to rule definitions. |
| assessment/balanceTest.ts | 4-Stage Balance Test rules. |
| assessment/chairRise.ts | Chair Rise test rules. |
| assessment/timedUpAndGo.ts | Timed Up and Go test rules. |
| warmup/headMovements.ts | Head movement warmup rules. |
| warmup/neckMovements.ts | Neck movement warmup rules. |
| warmup/backMovements.ts | Back extension warmup rules. |
| warmup/trunkMovements.ts | Trunk rotation warmup rules. |
| warmup/ankleMovements.ts | Ankle movement warmup rules. |
| strength/kneeExtensor.ts | Front knee strengthening rules. |
| strength/kneeFlexor.ts | Back knee strengthening rules. |
| strength/hipAbductor.ts | Side hip strengthening rules. |
| strength/calfRaises.ts | Calf raise rules. |
| strength/toeRaises.ts | Toe raise rules. |
| balance/kneeBends.ts | Knee bend rules. |
| balance/sitToStand.ts | Sit-to-stand rules. |
| balance/sidewaysWalk.ts | Sideways walk rules. |
| balance/backwardsWalk.ts | Backwards walk rules. |
| balance/walkAndTurn.ts | Walk and turn rules. |
| balance/oneLegStand.ts | One-leg stand rules. |
| balance/heelToeStand.ts | Heel-toe stand rules. |
| balance/heelToeWalk.ts | Heel-toe walk rules. |
| balance/heelWalking.ts | Heel walking rules. |
| balance/toeWalking.ts | Toe walking rules. |
| balance/heelToeWalkBackwards.ts | Heel-toe walk backwards rules. |

### Vision Components (src/vision/components/)

| File | Purpose |
|------|---------|
| GuideOverlay.tsx | Camera guide overlay showing positioning hints for the user. |
| SkeletonOverlay.tsx | Renders detected skeleton keypoints and connections over the camera feed. |
| skeletonUtils.ts | Helper functions for skeleton line drawing and keypoint rendering. |

### Vision Models (src/vision/models/)

| File | Purpose |
|------|---------|
| yolo26n_float16.tflite | YOLOv26n pose estimation model (~6MB). Bundled in the app binary. |

### UI Components (components/)

| File | Purpose |
|------|---------|
| ModelDownloadModal.tsx | Modal dialog for LLM model download with progress bar. |
| FRAMatrixCard.tsx | Fall Risk Assessment matrix visualization card. |
| graphs/FRAMatrixGraph.tsx | FRA matrix chart component. |
| graphs/LineGraph.tsx | Line graph for progress tracking. |

## functions/ -- Firebase Cloud Functions

| File | Purpose |
|------|---------|
| index.js | redcapSync scheduled function. Runs daily at 2am EST. Pull REDCap -> Firestore, push Firestore -> REDCap. |
| services/REDCap_Service.js | REDCap API wrapper. exportFromREDCap() and importToREDCap() with field mapping. |
| services/firestore-readers.js | getUsersForSync() -- queries users with non-null scores for REDCap push. |
| config/fieldMappings.js | Bidirectional field name mapping between Firestore and REDCap. |

## Training/slm/ -- LLM Finetuning Pipeline

| File | Purpose |
|------|---------|
| finetune.py | SFT training script. Qwen3.5-0.8B + LoRA (r=16) via Unsloth on mental health counseling data. |
| export_gguf.py | 3-stage export: merge LoRA adapters -> convert to F16 GGUF -> quantize to Q4_K_M. |
| resume_training.py | Resume training from a saved checkpoint. |
| upload_to_gcs.py | Upload final GGUF model to the qwenfinetune GCS bucket. |
| requirements.txt | Python dependencies (unsloth, torch, trl, transformers, google-cloud-storage). |
| EMPATHY_TRAINING_PIPELINE.md | Detailed training methodology: data preprocessing, SFT, DPO (planned), GGUF export, evaluation strategy. |

## Root Files

| File | Purpose |
|------|---------|
| README.md | Project overview, quick start, tech stack, team info. |
| ARCHITECTURE.md | System architecture, data flows, Firestore schema, design decisions. |
| FILE_MAP.md | This file. Complete source listing. |
| firebase.json | Firebase project config. Points to functions/ codebase for Cloud Functions deployment. |
| Allowed BAA.txt | Reference list of Google Cloud services covered under BAA (HIPAA). |
