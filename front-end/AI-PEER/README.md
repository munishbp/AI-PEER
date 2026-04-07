# AI-PEER Mobile App

React Native mobile app for fall risk assessment and exercise interventions. Built for UCF Senior Design 2025-2026 in collaboration with UCF College of Medicine. This is a bare workflow project that uses Expo libraries but is NOT managed by Expo.

## Requirements

- **Node.js 24** — pinned via `.nvmrc`. Use `nvm use` (or `fnm use`/`asdf install`) to match.
- **Xcode 26 or later** — for iOS builds, macOS only.
- **CocoaPods 1.16+** — install via Homebrew: `brew install cocoapods`. (We intentionally don't use bundler/Gemfile — macOS system Ruby is too old, and managing a separate Ruby toolchain is more failure-prone than just using Homebrew's standalone CocoaPods.)
- **Android Studio** — for Android builds.

## Setup

```bash
nvm use                                # Use pinned Node version (.nvmrc)
npm install                            # JS dependencies
cd ios && pod install && cd ..         # iOS native dependencies
cp .env.example .env                   # Fill in Firebase and API credentials
npm run ios:doctor                     # Verify environment is healthy
```

If `ios:doctor` reports any failures, fix them before attempting an iOS build. See **iOS Troubleshooting** below.

> **After pulling new changes** that touch `ios/Podfile`, `package.json`, or any native code: re-run `npm install`, then `cd ios && pod install && cd ..`, then `npm run ios:doctor`. If the build still misbehaves, `npm run ios:clean` is the one-command recovery.

> **Note:** `react-native-worklets-core` is a required direct dependency. It enables VisionCamera frame processors, which are what the custom MediaPipe Swift plugin (`PoseLandmarkerPlugin.swift`) builds on top of. It's distinct from the newer `react-native-worklets` package — both are needed but only `worklets-core` exposes VisionCamera's `FrameProcessorPlugin.h` headers to native code. If you ever see a "VisionCamera/FrameProcessorPlugin.h file not found" build error, the cause is `react-native-worklets-core` being missing from `node_modules`.

## iOS Troubleshooting

If an iOS build fails with C++ template errors (`Unknown type name 'requires'`, `JSArgT`, `ReturnT`), variable template errors, or any "works on my machine" weirdness, the cause is almost always environmental drift — stale Pods, wrong Command Line Tools selection, or a Clang module cache that predates a Podfile change.

**First, diagnose:**
```bash
npm run ios:doctor
```

This prints PASS/FAIL for every required piece of the iOS environment (Xcode version, Command Line Tools selection, Node version, CocoaPods, `Pods/`, `.env`, `react-native-worklets-core`). It is read-only and never modifies anything.

**Then, if doctor passes but the build still fails, nuke and rebuild:**
```bash
npm run ios:clean
```

This deintegrates and reinstalls Pods, wipes `~/Library/Developer/Xcode/DerivedData`, and reinstalls native dependencies from scratch. After it finishes, open Xcode → **Product → Clean Build Folder** (Cmd+Shift+K), then build.

> **Note:** `ios:clean` wipes DerivedData for **all** Xcode projects on this machine, not just AI-PEER. Other projects will rebuild from scratch on next open.

> **Why this happens:** VisionCamera and several other React Native libraries use C++20 features (concepts via `requires`, variable templates). Our `ios/Podfile` `post_install` hook forces `CLANG_CXX_LANGUAGE_STANDARD = c++20` on every pod target, but Xcode caches compiled headers in DerivedData and the Clang module cache — those caches can persist after Podfile changes and cause headers to be parsed against an older standard. `ios:clean` clears those caches.

**Common doctor failures:**
- *"Command Line Tools points at /Library/Developer/CommandLineTools"* — fix with `sudo xcode-select -s /Applications/Xcode.app`. This is the most common silent cause of toolchain drift.
- *"Node version mismatch"* — run `nvm use` (or `nvm install` if you don't have the pinned version).
- *"react-native-worklets-core missing"* — run `npm install`. It's a direct dependency required by the custom MediaPipe Swift plugin.
- *"pod not found"* or *"CocoaPods version too old"* — run `brew install cocoapods` or `brew upgrade cocoapods`.

## Running the App

Expo Go will not work. You must build the native app.

**Android:**
```bash
# Terminal 1: Start Metro bundler
npx expo start

# Terminal 2: Build and run (or use Android Studio)
npx expo run:android
```

**iOS (macOS only):**
```bash
npx expo start
npx expo run:ios
```

Or open `android/` or `ios/` directly in Android Studio / Xcode.

## Features

- Fall risk assessment with FRA matrix visualization and FES-I questionnaire
- SMS 2FA authentication via Google Identity Platform
- On-device AI chat powered by Qwen3.5-0.8B (finetuned on mental health counseling data, ~505MB, no data leaves phone)
- Conversation history with 24-hour auto-archive
- Real-time pose estimation via MediaPipe Pose Landmarker (~9MB model, GPU-accelerated, custom native plugin)
- 24 exercises with pose-based form analysis (3 assessment, 5 warmup, 5 strength, 11 balance)
- Rep counting with form scoring (angle, alignment, position checks)
- Exercise video library with signed URL delivery from GCS
- Daily workout recommendations with compliance tracking
- Activity tracking with weekly summaries and monthly heatmap
- Accessibility preferences (font scaling, high contrast)
- HIPAA-compliant design (all ML inference on-device)

## Project Structure

```
app/                           # Expo Router screens
  _layout.tsx                  # Root layout (providers: Auth, LLM, Vision, Prefs)
  index.tsx                    # Login/Register
  verify.tsx                   # SMS code verification
  welcome.tsx                  # Onboarding
  tutorial.tsx                 # App tutorial
  questionnaire.tsx            # FES-I fall risk questionnaire
  chat-history.tsx             # Conversation history list
  (tabs)/
    _layout.tsx                # Tab navigator (5 tabs)
    index.tsx                  # Home -- FRA matrix, scores, activity
    ai-chat.tsx                # On-device AI chat
    exercise.tsx               # Exercise category selector
    exercise-session.tsx       # Full-screen exercise with camera + pose overlay
    activity.tsx               # Activity tracking, compliance heatmap
    balance-test.tsx           # Balance assessment test
    video-confirm.tsx          # Video playback before exercise
    contacts.tsx               # Emergency contacts
    settings.tsx               # User preferences

src/
  api.ts                       # HTTP client for backend API
  firebaseClient.ts            # Firebase SDK init
  video.ts                     # Exercise video URL mapping
  daily-workout.ts             # Workout recommendation logic
  workout-combos.ts            # Exercise combinations
  exercise-activity-storage.ts # AsyncStorage for exercise logs
  fra-storage.ts               # AsyncStorage for FRA results
  prefs-context.tsx            # Accessibility preferences context
  theme.ts                     # Colors, typography, spacing

  auth/
    AuthContext.tsx             # Auth provider (login, register, refresh tokens)

  llm/
    LLMService.ts              # Singleton llama.rn wrapper (load, generate, release)
    LLMContext.tsx              # React Context (download, init, generate state)
    modelDownloader.ts          # Signed URL fetch + streaming download
    config.ts                  # Model filename, size, inference params
    systemPrompt.ts            # PEER framework persona + ChatML formatting
    useLLM.ts                  # Hook for components
    types.ts                   # ChatMessage, Conversation, LLMState

  vision/
    VisionService.ts           # MediaPipe landmark → COCO keypoint mapper
    VisionContext.tsx           # React Context for tracking state
    FormAnalyzer.ts            # Angle/alignment/position rule checking
    RepCounter.ts              # Rep state machine (1.2s cooldown)
    PoseSmoothing.ts           # Temporal keypoint smoothing
    frameProcessor.ts          # VisionCamera frame processor
    config.ts                  # Model config (640x640, 0.3 threshold)
    exercises/                 # 24 exercise rule definitions
      assessment/              # Balance test, chair rise, TUG
      warmup/                  # Head, neck, back, trunk, ankle
      strength/                # Knee ext/flex, hip abd, calf/toe raises
      balance/                 # 11 balance exercises
    components/
      GuideOverlay.tsx         # Camera positioning guide
      SkeletonOverlay.tsx      # Skeleton visualization
  ios/AIPEER/
    PoseLandmarkerPlugin.swift   # Custom VisionCamera plugin (MediaPipe, iOS)
    PoseLandmarkerPlugin.m       # ObjC registration for the Swift plugin
    pose_landmarker_full.task    # MediaPipe model (~9MB)

components/
  ModelDownloadModal.tsx       # LLM download dialog with progress bar
  FRAMatrixCard.tsx            # FRA matrix visualization
  graphs/                      # FRA and line graph components
```

## On-Device LLM

The AI chat uses Qwen3.5-0.8B (finetuned on mental health counseling conversations) running locally via llama.rn. On first use, the model (~505MB) is downloaded from GCS via a signed URL (requires authentication). All inference happens on-device for HIPAA compliance.

Configuration in `src/llm/config.ts`:
- Max tokens: 512
- Context size: 8192
- Temperature: 0.7
- Conversation TTL: 24 hours

## Pose Estimation

Real-time exercise form monitoring using Google MediaPipe Pose Landmarker (~9MB model). A custom native VisionCamera frame processor plugin (`PoseLandmarkerPlugin.swift` on iOS) runs MediaPipe inference with GPU acceleration (Metal). The model detects 33 3D landmarks per person, which are mapped to 17 COCO-compatible keypoints. Each of the 24 exercises has specific form rules (angle ranges, alignment tolerances, position requirements) defined in `src/vision/exercises/`. The RepCounter tracks reps using a state machine with 1.2-second cooldown to prevent double-counting. Form scores of 60+ indicate good form. The iOS Podfile requires `MediaPipeTasksVision` pod with xcframework linker workarounds (see Podfile comments).

## Environment Variables

See `.env.example` for required Firebase and API configuration.
