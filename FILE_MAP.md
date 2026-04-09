# File Map

Complete source file listing for the AI-PEER repository. UCF Senior Design 2025-2026.

## API/ -- Express Backend (Cloud Run)

| File | Purpose |
|------|---------|
| server.js | Express entry point. Mounts routes, applies CORS, JSON parsing, auth middleware. |
| .env.example | Template for GCS, Identity Platform, and server configuration. |
| config/firebaseConfig.js | Firebase Admin SDK initialization. Uses env vars locally, ADC on Cloud Run. Connects to the named `ai-peer` Firestore database (not the default). |
| middleware/authMiddleware.js | Verifies Firebase ID token from Authorization Bearer header AND attaches `req.user = decoded` so downstream controllers can read `req.user.uid` instead of trusting body params. |
| routes/authRoutes.js | /auth -- register, login, send-code (SMS 2FA), verify, refresh. |
| routes/userRoutes.js | /users -- register, get, update, delete. |
| routes/videosRoutes.js | /video -- 23 exercise video signed URL endpoints (the 4-stage balance test endpoint `/video/getBalanceURL` is still listed but the UI route was removed). |
| routes/modelRoutes.js | /model -- GET /getModelURL for LLM GGUF download. |
| routes/activitiesRoutes.js | /activities -- POST /complete (write), GET /list (read user history). Both require Bearer auth. |
| controllers/userController.js | User CRUD request handlers. |
| controllers/videoController.js | Per-exercise signed URL generation (23 active exercises). |
| controllers/modelController.js | Signed URL for Qwen3.5-2B GGUF in qwenfinetune bucket. |
| controllers/activitiesController.js | Per-user activity record submission and retrieval. Uses `req.user.uid` (never body params). Validates required schema fields before writing. |
| services/Auth_Service.js | Firebase custom token creation, Identity Platform SMS send/verify. |
| services/GCS_Service.js | V4 signed URL generation. Supports override bucket param. Uses IAM signBlob on Cloud Run. |
| services/firestore-functions.js | Firestore CRUD helpers for the `users` collection AND the new `users/{uid}/activities/{activityId}` subcollection (writeUserActivity, getUserActivities). |

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
| (tabs)/exercise-session.tsx | Multi-set exercise session. Camera + skeleton + open-palm gesture-confirm start flow + 5-second countdown + rep counter + per-set summary. Persists completed activities locally and to backend on final-set submit. |
| (tabs)/activity.tsx | Activity tracking. Today's progress, weekly breakdown, monthly compliance heatmap. |
| (tabs)/balance-test.tsx | Fall-risk assessment landing page with two clinical tests (Chair Rise, Timed Up and Go). |
| (tabs)/chair-rise-test.tsx | 30-second sit-to-stand assessment. Camera + open-palm start flow + 30s timer + rep counter + fall-risk band classification. |
| (tabs)/tug-test.tsx | Timed Up and Go assessment. Camera + open-palm start flow + state machine (waiting_for_stand → walking → waiting_for_final_sit) using 3D knee angle from MediaPipe. |
| (tabs)/video-confirm.tsx | Video playback confirmation before starting exercise. |
| (tabs)/contacts.tsx | Emergency contacts management (Firestore-backed). |
| (tabs)/settings.tsx | User preferences (font scaling, high contrast, logout). |

### Core Modules (src/)

| File | Purpose |
|------|---------|
| api.ts | HTTP client. requestJSON helper, all API endpoint definitions (auth, users, model, video). |
| firebaseClient.ts | Firebase client SDK initialization (Auth only — Firestore is server-side via the API). |
| firebaseConfig.example.ts | Template for Firebase client config values. |
| video.ts | Exercise ID to video endpoint mapping + fetchVideoUrl() helper. |
| daily-workout.ts | Daily workout recommendation logic based on user progress. |
| workout-combos.ts | Predefined exercise combinations by category and difficulty. |
| exercise-activity-storage.ts | Dual-write persistence for completed exercise activity records: AsyncStorage (always, immediate) + POST /activities/complete (best-effort, calls auth.currentUser.getIdToken(true) for fresh ID token). Schema includes per-rep angle history, feedback events, set-by-set rep counts, and aggregate stats. |
| fra-storage.ts | AsyncStorage persistence for FES-I questionnaire results. |
| prefs-context.tsx | React Context for accessibility preferences (font scale, contrast). |
| theme.ts | App-wide color palette, typography, and spacing constants. |

### Auth Module (src/auth/)

| File | Purpose |
|------|---------|
| AuthContext.tsx | React Context provider. Two-token persistence: refresh token in AsyncStorage → POST /auth/refresh → custom token → signInWithCustomToken → ID token in state. The state token is NOT auto-refreshed; per-request callers should use `auth.currentUser?.getIdToken(true)` for guaranteed-fresh tokens. |
| index.ts | Barrel export for AuthProvider and useAuth hook. |

### LLM Module (src/llm/)

| File | Purpose |
|------|---------|
| LLMService.ts | Singleton llama.rn wrapper. Loads model, runs inference, releases memory. |
| LLMContext.tsx | React Context for LLM state (download progress, model loaded, generating). Uses auth token for model download. |
| modelDownloader.ts | Fetches signed URL from API, downloads GGUF with progress tracking, cleans up old model files. |
| config.ts | Model filename, expected size (~1.2GB), inference params (512 tokens, temp 0.7, top_p 0.9, ctx 8192). |
| systemPrompt.ts | PEER framework system prompt + ChatML prompt formatting function. |
| types.ts | ChatMessage, Conversation, LLMState, InferenceConfig type definitions. |
| useLLM.ts | React hook exposing LLM state and actions (send, downloadAndInit, clear). |
| index.ts | Barrel export for LLMProvider, useLLM, config values, downloader functions. |

### Vision Module (src/vision/)

| File | Purpose |
|------|---------|
| VisionService.ts | Maps MediaPipe 33 pose landmarks to 17 COCO keypoints (mapMediaPipeToPose) AND 21 hand landmarks per detected hand to the Hand type (mapMediaPipeToHands). Handles iOS landscape→portrait coordinate rotation, Android Y-flip, and iOS L/R label swap for the pre-mirrored front camera. |
| VisionContext.tsx | React Context for vision state. Owns the trackingMode state machine (idle → waiting_for_gesture → countdown → tracking), the open-palm detector with handedness-based palm-normal cross-product check (with Platform.OS branch for Android), the form-check 300ms smoothing, and the rep counter lifecycle. |
| FormAnalyzer.ts | Per-frame check loop that evaluates the current pose against exercise rules (angle, alignment, position, distance). Supports rep-zone gating (skip checks while inside the rep's start/end zones) and severity gradation (mild/moderate/severe based on degrees outside the acceptable range). Returns binary 100/0 score; the smoother in VisionContext averages frames into a percentage. |
| RepCounter.ts | Rep state machine (idle → in_start → in_end). 1.2s cooldown, 2-frame zone persistence, 15° minimum movement validation. Supports angle, distance, and 3D-angle modes plus bilateral keypoint averaging. Tracks per-rep angle history (start/end/peak/duration) for activity records. |
| frameProcessor.ts | VisionCamera worklet bridge. Calls the native plugin once per frame, unpacks the {pose, hands} return shape, forwards both to mapMediaPipeToPose / mapMediaPipeToHands on the JS thread. |
| config.ts | Vision module config: confidence thresholds, FPS settings. |
| constants.ts | COCO keypoint names (17 points), skeleton connection pairs. |
| types.ts | Keypoint, Pose, FormViolation (severity union: error / warning / mild / moderate / severe), FormFeedback type definitions. |
| useVision.ts | React hook exposing vision state, the trackingMode + countdown countdown, startTracking / startGestureWatch / stopTracking actions, and the getRepHistory snapshot getter. |
| index.ts | Barrel export for VisionProvider, useVision. |

### Exercise Rules (src/vision/exercises/)

| File | Purpose |
|------|---------|
| types.ts | ExerciseRule, AngleCheck, AlignmentCheck, PositionCheck, DistanceCheck interfaces. |
| utils.ts | Angle calculation between 3 keypoints, alignment and distance helpers. |
| index.ts | Exercise registry. Maps exercise IDs to rule definitions. |
| assessment/balanceTest.ts | 4-Stage Balance Test rules. **Parked stub** — UI route was removed in commit `c0345ad2`; the file and registry entry are kept to avoid breaking type assumptions but no screen reaches it. |
| assessment/chairRise.ts | Chair Rise (30-second sit-to-stand) test rules. |
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

### Native Plugins (iOS)

| File | Purpose |
|------|---------|
| ios/AIPEER/PoseLandmarkerPlugin.swift | Custom VisionCamera frame processor plugin. Runs MediaPipe **Pose Landmarker AND Hand Landmarker** in parallel on the same frame, returns `{pose: [...33], hands: [{landmarks: [...21], handedness}]}`. GPU-accelerated via Metal. |
| ios/AIPEER/PoseLandmarkerPlugin.m | ObjC registration file for the Swift plugin (VISION_EXPORT_SWIFT_FRAME_PROCESSOR macro). |
| ios/AIPEER/pose_landmarker_full.task | MediaPipe Pose Landmarker model (~9MB). Bundled in the iOS app. |
| ios/AIPEER/hand_landmarker.task | MediaPipe Hand Landmarker model (~7MB). Bundled in the iOS app. |

### Native Plugins (Android)

| File | Purpose |
|------|---------|
| android/app/src/main/java/com/anonymous/aipeer/poselandmarker/PoseLandmarkerFrameProcessorPlugin.kt | Android port of the Swift plugin. Same dual-task contract: Pose + Hand from a single callback, returns `{pose, hands}`. Lazy thread-affine init with GPU→CPU fallback per landmarker. |
| android/app/src/main/assets/pose_landmarker_full.task | MediaPipe Pose Landmarker model (Android copy). |
| android/app/src/main/assets/hand_landmarker.task | MediaPipe Hand Landmarker model (Android copy). |

### Bundled Assets (assets/models/)

| File | Purpose |
|------|---------|
| assets/models/pose_landmarker_full.task | Canonical Pose model file. Source of truth — copied to ios/AIPEER/ and android/app/src/main/assets/. |
| assets/models/hand_landmarker.task | Canonical Hand model file. Same copy pattern. |

### UI Components (components/)

| File | Purpose |
|------|---------|
| ModelDownloadModal.tsx | Modal dialog for LLM model download with progress bar. |
| FRAMatrixCard.tsx | Fall Risk Assessment matrix visualization card. |
| GestureCountdownOverlay.tsx | Presentational overlay for the gesture-confirm start flow. Renders the "Hold up an open palm to start" prompt during waiting_for_gesture and the 5-4-3-2-1 number during countdown. Speaks the prompt + each tick via expo-speech. |
| graphs/FRAMatrixGraph.tsx | FRA matrix chart component. |
| graphs/LineGraph.tsx | Line graph for progress tracking. |

### Build Scripts (scripts/)

| File | Purpose |
|------|---------|
| scripts/ios-doctor.sh | iOS preflight diagnostic. Read-only. PASS/FAIL per check (Xcode version, Command Line Tools selection, Node version, CocoaPods, Pods/, .env, react-native-worklets-core). Run via `npm run ios:doctor`. |
| scripts/ios-clean.sh | iOS recovery. Pod deintegrate + reinstall, wipe `~/Library/Developer/Xcode/DerivedData`, fresh install. Use when doctor passes but build still fails. Run via `npm run ios:clean`. |
| scripts/android-doctor.sh | Android preflight diagnostic. Read-only. PASS/FAIL per check (JDK, Android SDK, Gradle, env vars, gradle.properties, daemons). Run via `npm run android:doctor`. |
| scripts/android-clean.sh | Android recovery. Gradle clean + wipe build dirs and Gradle daemons. Run via `npm run android:clean`. |
| scripts/reset-project.js | Reset Expo template state to a blank starting point. Rarely needed; ships with the Expo template. |

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
| finetune.py | SFT training script. Qwen/Qwen3.5-2B + LoRA (r=16) via unsloth on [YsK-dev/geriatric-health-advice](https://huggingface.co/datasets/YsK-dev/geriatric-health-advice) (Apache 2.0). Exports Q4_K_M GGUF via unsloth's `save_pretrained_gguf`. |
| upload_to_gcs.py | Upload final GGUF model to the qwenfinetune GCS bucket. |
| requirements.txt | Python dependencies (unsloth, torch, trl, transformers, google-cloud-storage). |
| TRAINING_PLAN.md | End-to-end recipe: dataset citation, hardware requirements, Linux/vast.ai setup script with gotchas, reference run stats, shipping steps. |

## Root Files

| File | Purpose |
|------|---------|
| README.md | Project overview, quick start, tech stack, team info. |
| ARCHITECTURE.md | System architecture, data flows, Firestore schema, design decisions. |
| FILE_MAP.md | This file. Complete source listing. |
| firebase.json | Firebase project config. Points to functions/ codebase for Cloud Functions deployment. |
| Allowed BAA.txt | Reference list of Google Cloud services covered under BAA (HIPAA). |
