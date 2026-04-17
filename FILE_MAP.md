# File Map

Complete source file guide for the AI-PEER repository. UCF Senior Design 2025-2026.
React Native 0.81.5 bare workflow. Answers the question "where does X live?"

---

## 1. Repository Layout

- **API/** — Express.js backend, deployed to Google Cloud Run.
- **front-end/AI-PEER/** — React Native bare app (Expo 54, RN 0.81.5).
- **functions/** — Firebase Functions (Cloud Functions v2); scheduled jobs only.
- **Training/slm/** — Fine-tuning scripts for the on-device Qwen3.5-2B model.
- **firebase.json** — Firebase deploy config (functions, Firestore, hosting rules).

---

## 2. Frontend App Routes

Files under `front-end/AI-PEER/app/`. These are Expo Router stack screens.

- **app/_layout.tsx** — Root layout; wraps the entire app in `AuthProvider`, `LLMProvider`, `PrefsProvider`, `VisionProvider`; registers all stack routes; requests notification permissions on mount.
- **app/(tabs)/_layout.tsx** — Tab bar layout; defines the five visible tabs (Home, AI Chat, Activity, Contacts, Settings) and registers the hidden tab routes (exercise, balance-test, etc.) so they keep the tab bar visible.
- **app/index.tsx** — Login screen; phone + password form; entry point for unauthenticated users.
- **app/login.tsx** — Re-exports `app/index.tsx` (alias route for `/login`).
- **app/verify.tsx** — SMS verification screen; accepts the 6-digit OTP, exchanges it for a custom Firebase token, and stores the refresh token.
- **app/welcome.tsx** — First-run accessibility onboarding screen; lets user pick font size, contrast, language, and sound before entering the app.
- **app/questionnaire.tsx** — FES-I fall-efficacy questionnaire (7 questions); saves result via `fra-storage.ts`.
- **app/chat-history.tsx** — Conversation history list; tap to resume a past conversation, swipe/button to delete.
- **app/modal.tsx** — Generic modal route from the Expo template (placeholder).
- **app/+not-found.tsx** — 404 fallback screen.
- **app/+html.tsx** — Web-only HTML shell (not used on native).

---

## 3. Frontend Tab Screens

Files under `front-end/AI-PEER/app/(tabs)/`.

- **app/(tabs)/index.tsx** — Home screen; shows today's workout card, FRA matrix, and entry points to exercise and assessment flows.
- **app/(tabs)/ai-chat.tsx** — On-device AI chat screen; wraps the Qwen3.5-2B LLM via `useLLM`; shows `ModelDownloadModal` on first use; 24-hour conversation TTL.
- **app/(tabs)/activity.tsx** — Activity history screen; reads exercise completion records from `exercise-activity-storage.ts` and renders them with `LineGraph`.
- **app/(tabs)/contacts.tsx** — Emergency contacts screen; lets users add/edit caregiver phone numbers stored in Firestore.
- **app/(tabs)/settings.tsx** — Accessibility and reminder settings; font scale, contrast, language, sound toggle, and daily reminder scheduler.
- **app/(tabs)/exercise.tsx** — Exercise catalog screen; lists warmup, strength, and balance exercises; navigates to `exercise-session` for a selected exercise.
- **app/(tabs)/exercise-session.tsx** — Live exercise session screen; shows the video demo, runs the VisionCamera pose pipeline with `GestureCountdownOverlay`, `SkeletonOverlay`, and `GuideOverlay`; saves a completion record on finish.
- **app/(tabs)/exercise-summary.tsx** — Post-session summary screen; shows rep count, form score, and ROM data from the just-completed session.
- **app/(tabs)/video-confirm.tsx** — Video playback confirmation screen; plays the GCS-signed exercise video and lets the user confirm they are ready before the live session begins.
- **app/(tabs)/balance-test.tsx** — Balance assessment screen (one-leg stand); pose-tracked, results saved to Firestore.
- **app/(tabs)/chair-rise-test.tsx** — Chair-rise assessment screen (5x sit-to-stand); pose-tracked rep counter, results saved.
- **app/(tabs)/tug-test.tsx** — Timed Up and Go (TUG) assessment screen; pose-tracked with looser palm-gesture thresholds for the greater filming distance.

---

## 4. Frontend Components

Files under `front-end/AI-PEER/components/`.

- **components/GestureCountdownOverlay.tsx** — Overlay rendered during the `waiting_for_gesture` and `countdown` VisionContext states; shows the arms-overhead prompt and the 5-4-3-2-1 countdown with TTS audio cues.
- **components/FRAMatrixCard.tsx** — Fall-Risk Appraisal matrix card; plots the user in one of four quadrants (Rational/Irrational/Incongruent/Congruent) based on BTrackS and FES-I scores; allows inline BTrackS score editing.
- **components/ModelDownloadModal.tsx** — Modal shown when the LLM model has not been downloaded; displays file-size warning, download button, progress bar, and error/retry states.
- **components/graphs/FRAMatrixGraph.tsx** — SVG-based 2×2 risk matrix graph; takes a 0-100 risk percent and renders a quadrant dot.
- **components/graphs/LineGraph.tsx** — Generic SVG line graph for activity history sparklines.
- **components/themed-text.tsx** — Text component that reads color from `usePrefs`.
- **components/themed-view.tsx** — View component that reads color from `usePrefs`.
- **components/haptic-tab.tsx** — Tab bar button with haptic feedback on press.
- **components/ui/icon-symbol.tsx** — Cross-platform icon wrapper (SF Symbols on iOS, Material on Android/web).
- **components/ui/icon-symbol.ios.tsx** — iOS-specific SF Symbol icon wrapper.

---

## 5. Frontend Src Services

### Root-level services — `front-end/AI-PEER/src/`

- **src/api.ts** — Typed HTTP client for the backend API; exports `api` (login, register, refresh) and `BASE` URL; reads `EXPO_PUBLIC_API_BASE_URL` from env with a Cloud Run fallback.
- **src/firebaseClient.ts** — Initializes the Firebase app and exports `auth`; reads Firebase config from `EXPO_PUBLIC_FIREBASE_*` env vars.
- **src/firebaseConfig.example.ts** — Example/template showing required Firebase env vars; not imported at runtime.
- **src/prefs-context.tsx** — Global accessibility preferences context (`fontScale`, `contrast`, `language`, `soundAlerts`); persists to AsyncStorage; exposes `usePrefs()` hook.
- **src/theme.ts** — Design-token file; exports `colors`, `darkColors`, `highContrastColors`, `colorsByContrast`, `scaleFontSizes`, `spacing`, `radii`, `fontSizes`.
- **src/i18n.ts** — Initializes i18next with `react-i18next`; loads the three translation JSON bundles; exposes the configured `i18n` singleton.
- **src/tts.ts** — TTS language helper; maps the app language preference (`en`/`es`/`ht`) to a system voice locale string (`en-US`/`es-ES`/`fr-FR`); exports `speak()` wrapper around `expo-speech`.
- **src/reminder-notifications.ts** — Daily workout reminder scheduler; manages `expo-notifications` permission, schedules/cancels repeating local notifications, and serializes reminder config to AsyncStorage.
- **src/fra-storage.ts** — FES-I questionnaire local save (AsyncStorage) and Firestore upload; exports `saveQuestionnaireResult` and `uploadQuestionnaireToFirestore`.
- **src/exercise-activity-storage.ts** — Exercise completion record type (`ExerciseCompletionRecord`) and storage helpers; writes to AsyncStorage and POSTs to the `/activities` backend endpoint.
- **src/video.ts** — Maps exercise IDs to their backend video endpoint paths; provides `fetchExerciseVideo()` to obtain a signed GCS URL.
- **src/daily-workout.ts** — Selects today's daily workout (all warmups + all strength + 3 rotating balance exercises) based on exercise history.
- **src/workout-combos.ts** — Defines the `WorkoutCombo` type (`warmup[]`, `strength[]`, `balance[]`).

### Auth — `src/auth/`

- **src/auth/AuthContext.tsx** — Dual-token auth context; on mount restores session from a refresh token in AsyncStorage; exposes `useAuth()` with `user`, `token`, `login`, `register`, `logout`; Firebase custom-token sign-in.
- **src/auth/index.ts** — Re-exports `AuthProvider` and `useAuth`.

### LLM — `src/llm/`

- **src/llm/LLMContext.tsx** — React context managing download state, model initialization, and multi-conversation storage (24-hour TTL, persisted to AsyncStorage) for the on-device LLM.
- **src/llm/LLMService.ts** — Singleton that holds the loaded `llama.rn` model instance; prevents duplicate loads; exposes `initialize()`, `generate()`, `isReady()`, `cleanup()`.
- **src/llm/modelDownloader.ts** — Downloads the ~1.2 GB GGUF model from a backend-issued signed GCS URL with progress callbacks; handles resume, cleanup of old versions.
- **src/llm/systemPrompt.ts** — PEER framework system prompt; constrains the model to fall-prevention coaching, enforces 3-sentence response limit, no PHI.
- **src/llm/config.ts** — LLM configuration constants: model filename, size, inference parameters, conversation TTL, AsyncStorage keys.
- **src/llm/types.ts** — TypeScript interfaces for `ChatMessage`, `Conversation`, `LLMState`, `InferenceConfig`.
- **src/llm/useLLM.ts** — Simplified consumer hook; wraps `LLMContext` and exposes `isReady`, `needsDownload`, `messages`, `send`, multi-conversation helpers.
- **src/llm/index.ts** — Public re-exports for the LLM module.

### Vision — `src/vision/`

- **src/vision/VisionContext.tsx** — Core vision state machine; manages `TrackingMode` (`idle` / `waiting_for_gesture` / `countdown` / `tracking`); runs the open-palm gesture detector, 5-second countdown ladder, rep counter, and 300ms violation smoother; exposes `useVisionContext()`.
- **src/vision/frameProcessor.ts** — `useFrameProcessor` hook; calls the native `poseLandmarker` VisionCamera plugin per frame, parses both pose and hand landmarks, and calls `handlePoseResult` on the JS thread.
- **src/vision/VisionService.ts** — Converts MediaPipe 33-landmark output to 17-keypoint COCO format; applies iOS portrait coordinate transform and front-camera mirror correction; parses hand landmarks.
- **src/vision/FormAnalyzer.ts** — Evaluates a `Pose` against an exercise's `ExerciseRule` checks (angle, alignment, position) and returns a `FormFeedback` with violations.
- **src/vision/RepCounter.ts** — Two-phase rep counter (`in_start` / `in_end`) driven by joint angle or normalized distance; records per-rep `RepHistoryEntry` (startAngle, peakAngle, ROM, duration).
- **src/vision/useVision.ts** — Simplified consumer hook wrapping `VisionContext`.
- **src/vision/config.ts** — Detection thresholds and performance settings for the MediaPipe pipeline.
- **src/vision/constants.ts** — COCO 17 keypoint names and skeleton connection pairs for rendering.
- **src/vision/types.ts** — TypeScript types: `Keypoint`, `Pose`, `FormViolation`, `FormFeedback`, `VisionState`, `VisionConfig`.
- **src/vision/index.ts** — Public re-exports for the vision module.

#### Vision Components — `src/vision/components/`

- **src/vision/components/SkeletonOverlay.tsx** — SVG overlay rendering joints and bones color-coded by form quality (green/yellow/red) at ~5 Hz.
- **src/vision/components/GuideOverlay.tsx** — SVG overlay rendering angle arcs and alignment lines showing where form corrections are needed; drawn behind the skeleton.
- **src/vision/components/skeletonUtils.ts** — Shared geometry helpers for both overlays: screen-coordinate mapping, violation color lookup, SVG arc generation.

#### Exercise Rules — `src/vision/exercises/`

- **src/vision/exercises/types.ts** — `ExerciseRule`, `AngleCheck`, `AlignmentCheck`, `PositionCheck`, `RepConfig` type definitions.
- **src/vision/exercises/utils.ts** — Geometry utilities: `calculateAngle`, `calculateAngle3D`, `angleFromVertical`, `angleFromHorizontal`, `isAbove`, `isBelow`, `isConfident`.
- **src/vision/exercises/index.ts** — Registry that merges all exercise categories; exports `getExerciseRules(id)`, `getAllExerciseIds()`, `getExercisesByCategory()`.
- **src/vision/exercises/assessment/balanceTest.ts** — One-leg-stand balance assessment rule.
- **src/vision/exercises/assessment/chairRise.ts** — 5x chair-rise assessment rule.
- **src/vision/exercises/assessment/timedUpAndGo.ts** — Timed Up and Go (TUG) assessment rule.
- **src/vision/exercises/assessment/index.ts** — Re-exports assessment rules.
- **src/vision/exercises/balance/oneLegStand.ts** — Left one-leg stand balance exercise rule.
- **src/vision/exercises/balance/oneLegStandRight.ts** — Right one-leg stand balance exercise rule.
- **src/vision/exercises/balance/heelToeStand.ts** — Heel-to-toe tandem stand rule.
- **src/vision/exercises/balance/heelToeWalk.ts** — Heel-to-toe forward walk rule.
- **src/vision/exercises/balance/heelToeWalkBackwards.ts** — Heel-to-toe backward walk rule.
- **src/vision/exercises/balance/sidewaysWalk.ts** — Sideways walking rule.
- **src/vision/exercises/balance/backwardsWalk.ts** — Backwards walking rule.
- **src/vision/exercises/balance/heelWalking.ts** — Heel walking rule.
- **src/vision/exercises/balance/toeWalking.ts** — Toe walking rule.
- **src/vision/exercises/balance/kneeBends.ts** — Standing knee bends rule.
- **src/vision/exercises/balance/sitToStand.ts** — Sit-to-stand balance rule.
- **src/vision/exercises/balance/walkAndTurn.ts** — Walk-and-turn rule.
- **src/vision/exercises/balance/index.ts** — Re-exports balance rules.
- **src/vision/exercises/strength/kneeExtensor.ts** — Left knee extension (quad) rule.
- **src/vision/exercises/strength/kneeExtensorRight.ts** — Right knee extension rule.
- **src/vision/exercises/strength/kneeFlexor.ts** — Left knee flexion (hamstring) rule.
- **src/vision/exercises/strength/kneeFlexorRight.ts** — Right knee flexion rule.
- **src/vision/exercises/strength/hipAbductor.ts** — Left hip abduction rule.
- **src/vision/exercises/strength/hipAbductorRight.ts** — Right hip abduction rule.
- **src/vision/exercises/strength/calfRaises.ts** — Bilateral calf raise rule.
- **src/vision/exercises/strength/toeRaises.ts** — Bilateral toe raise rule.
- **src/vision/exercises/strength/index.ts** — Re-exports strength rules.
- **src/vision/exercises/warmup/ankleMovements.ts** — Ankle circles/pumps warmup rule.
- **src/vision/exercises/warmup/backMovements.ts** — Back rotation warmup rule.
- **src/vision/exercises/warmup/headMovements.ts** — Head tilt/turn warmup rule.
- **src/vision/exercises/warmup/neckMovements.ts** — Neck stretch warmup rule.
- **src/vision/exercises/warmup/trunkMovements.ts** — Trunk side bend warmup rule.
- **src/vision/exercises/warmup/index.ts** — Re-exports warmup rules.

#### Locales — `src/locales/`

- **src/locales/en/translation.json** — English UI strings.
- **src/locales/es/translation.json** — Spanish UI strings.
- **src/locales/ht/translation.json** — Haitian Creole UI strings.

---

## 6. Backend API

Files under `API/`. Deployed as a single Node.js service on Google Cloud Run.

- **API/server.js** — Express entry point; mounts CORS, JSON body parser, and all route groups; applies `authMiddleware` after the `/auth` routes so public endpoints remain accessible.
- **API/config/firebaseConfig.js** — Initializes Firebase Admin SDK; exports `admin`, `auth`, and `db` (Firestore) instances used by controllers and services.
- **API/middleware/authMiddleware.js** — Verifies the Firebase ID token from the `Authorization: Bearer` header; attaches the decoded token to `req.user` so downstream handlers never trust body-supplied user IDs.
- **API/routes/authRoutes.js** — `/auth` routes; handles register, login (phone/password), SMS OTP send/verify via Identity Platform, and refresh-token exchange; hashes passwords with bcrypt, issues custom Firebase tokens and long-lived refresh tokens.
- **API/routes/userRoutes.js** — `/users` routes; CRUD for user profile documents in Firestore.
- **API/routes/activitiesRoutes.js** — `/activities` routes; append and retrieve per-user exercise completion records.
- **API/routes/videosRoutes.js** — `/video` routes; generates short-lived signed GCS URLs for exercise demo videos.
- **API/routes/modelRoutes.js** — `/model` routes; generates a signed GCS URL for the finetuned GGUF model file.
- **API/controllers/userController.js** — Handles register, read, update, delete user logic; delegates to `firestore-functions.js`.
- **API/controllers/activitiesController.js** — Handles activity record append and retrieval; user ID always comes from `req.user.uid` (never from body params).
- **API/controllers/videoController.js** — Calls `GCS_Service.generateSignedUrl` and returns the signed URL for a requested exercise video.
- **API/controllers/modelController.js** — Returns a signed GCS URL for `models/Qwen3.5-2B-aipeer-Q4_K_M.gguf` from the private model bucket.
- **API/services/Auth_Service.js** — Firebase Authentication utilities; wraps Identity Platform REST API for SMS OTP send/verify and Firebase Admin SDK for custom token minting and ID token verification.
- **API/services/GCS_Service.js** — Google Cloud Storage helper; generates HIPAA-compliant short-lived signed URLs using IAM Credentials (service-account impersonation for Cloud Run).
- **API/services/firestore-functions.js** — Firestore data access layer used by user and activity controllers; all reads and writes to the `ai-peer` Firestore database go through this file.

---

## 7. Firebase Functions

- **functions/index.js** — Exports `redcapSync`, a Cloud Scheduler function that runs nightly at 2am ET; pulls assessment scores from REDCap into Firestore and pushes in-app compliance metrics back to REDCap.
- **functions/services/REDCap_Service.js** — REDCap REST API client; `exportFromREDCap()` pulls records, `importToREDCap()` pushes records.
- **functions/services/firestore-readers.js** — Firestore read helpers for the sync function; `getUsersForSync()` fetches all user documents that need REDCap reconciliation.
- **functions/config/fieldMappings.js** — Bidirectional Firestore-to-REDCap field-name mapping table; edit this file when field names change.

---

## 8. Training

- **Training/slm/finetune.py** — Fine-tunes Qwen/Qwen3.5-2B on `YsK-dev/geriatric-health-advice` using LoRA via Unsloth; exports a merged GGUF for on-device inference.
- **Training/slm/upload_to_gcs.py** — Uploads the exported GGUF model file to the private GCS model bucket after fine-tuning.
- **Training/slm/TRAINING_PLAN.md** — Documents the fine-tuning rationale, dataset choice, hyperparameters, and evaluation plan.
- **Training/slm/requirements.txt** — Python package requirements for the training environment.

---

## 9. Native iOS Layer

Files under `front-end/AI-PEER/ios/`.

- **ios/Podfile** — CocoaPods manifest; enables the New Architecture, sets the deployment target, and links all RN and Expo native dependencies.
- **ios/Podfile.lock** — Locked CocoaPods dependency versions; commit this to keep builds reproducible.
- **ios/AIPEER.xcworkspace** — Xcode workspace; open this (not the `.xcodeproj`) to build — do not open the project file directly.
- **ios/AIPEER/AppDelegate.swift** — Expo/RN app delegate; bootstraps the React Native factory and the Expo module system.
- **ios/AIPEER/PoseLandmarkerPlugin.swift** — Custom VisionCamera frame processor plugin; wraps MediaPipe Pose Landmarker in `.video` (synchronous) mode; returns 33 pose landmarks and up to two hand-landmark arrays per frame to JS.
- **ios/AIPEER/PoseLandmarkerPlugin.m** — Objective-C stub that registers `PoseLandmarkerPlugin.swift` with VisionCamera via `VISION_EXPORT_SWIFT_FRAME_PROCESSOR`.
- **ios/AIPEER/AIPEER-Bridging-Header.h** — Swift/Objective-C bridging header.
- **ios/AIPEER/Info.plist** — App metadata: bundle ID, display name, camera/microphone usage descriptions.
- **ios/AIPEER/PrivacyInfo.xcprivacy** — Apple privacy manifest declaring camera, microphone, and local-storage API usage reasons.
- **ios/AIPEER/pose_landmarker_full.task** — Bundled MediaPipe Pose Landmarker model file (full variant) used by `PoseLandmarkerPlugin`.
- **ios/AIPEER/hand_landmarker.task** — Bundled MediaPipe Hand Landmarker model file used by `PoseLandmarkerPlugin` to return hand landmarks.

---

## 10. Build and Tooling Config

Files under `front-end/AI-PEER/`.

- **package.json** — App dependencies and scripts: `start` (Expo dev server), `ios` (opens Xcode workspace), `android` (Expo run), `lint`, `typecheck`, `ios:doctor`, `ios:clean`, `android:doctor`, `android:clean`.
- **metro.config.js** — Metro bundler config; adds `.tflite` to asset extensions; resolves the `@/` path alias from `tsconfig.json`.
- **tsconfig.json** — TypeScript config; extends `expo/tsconfig.base`; maps `@/*` to the project root for absolute imports.
- **eslint.config.js** — ESLint flat config; extends `eslint-config-expo`.
- **app.json** — Expo app manifest; defines app name, slug, iOS bundle ID, Android package, and plugin list.
- **expo-env.d.ts** — Ambient type declarations generated by Expo for environment variables.
