# AI-PEER Setup Guide

For a new team member on a blank Mac. Gets you from "just cloned the repo" to "app running on a device or simulator, backend reachable."

---

## Prerequisites (macOS)

### Node

The frontend `.nvmrc` pins **Node 24**. The API requires Node >= 20. Use Node 24 for everything.

```bash
# If you use nvm:
nvm install 24
nvm use 24

# If you use fnm:
fnm install 24
fnm use 24
```

Confirm: `node --version` should print `v24.x.x`.

### Xcode

iOS deployment target is **15.1** (set in `ios/Podfile`). You need **Xcode 26 or later** (the README requires it; Xcode 26 ships with a Clang that handles the C++20 features VisionCamera relies on).

Install from the Mac App Store or [developer.apple.com/download](https://developer.apple.com/download). After installing, accept the license and point the developer tools at Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app
sudo xcodebuild -license accept
```

### CocoaPods

Install via Homebrew (version 1.16+). Do not use `sudo gem install` — the macOS system Ruby is too old.

```bash
brew install cocoapods
```

Confirm: `pod --version` should print `1.16.x` or higher.

### Watchman

```bash
brew install watchman
```

### Android Studio and JDK (only if running Android)

- Install **Android Studio** from [developer.android.com/studio](https://developer.android.com/studio).
- Install **JDK 17** (React Native's Gradle build requires it). Android Studio bundles one; set `JAVA_HOME` to point at it.
- In the SDK Manager, install the Android SDK platform and build tools versions matching `android/build.gradle`.
- Set environment variables:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### gcloud CLI (backend deploy only)

```bash
brew install --cask google-cloud-sdk
gcloud auth login
gcloud config set project <your-project-id>
```

### Firebase CLI (Functions deploy only)

```bash
npm install -g firebase-tools
firebase login
```

---

## Clone and install

```bash
git clone https://github.com/munishbp/AI-PEER.git
cd AI-PEER
```

There are three independent Node dependency trees. Install each one:

```bash
# 1. React Native frontend
cd front-end/AI-PEER
nvm use          # activates Node 24 from .nvmrc
npm install

# 2. Express API backend
cd ../../API
npm install

# 3. Firebase Cloud Functions
cd ../functions
npm install
```

Then install iOS native pods (macOS only):

```bash
cd ../front-end/AI-PEER/ios
pod install
cd ..
```

`pod install` can take several minutes the first time — it fetches MediaPipe, VisionCamera, and all other native pods.

After `pod install`, run the iOS doctor to verify the environment is healthy before your first build:

```bash
# from front-end/AI-PEER
npm run ios:doctor
```

Fix any FAIL items before proceeding (see "Common first-run failures" below).

---

## Secrets and environment variables

### Frontend (`front-end/AI-PEER/.env`)

Copy the example file and fill in values:

```bash
cp front-end/AI-PEER/.env.example front-end/AI-PEER/.env
```

| Variable | Purpose | Who to ask |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Client SDK | Firebase Console → Project Settings → Your Apps |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client SDK | same |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Client SDK | same |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Client SDK | same |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Client SDK | same |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase Client SDK | same |
| `EXPO_PUBLIC_API_BASE_URL` | Points the app at the Express API. Defaults to the production Cloud Run URL if unset. For local dev, override to `http://localhost:3000`. | Leave as-is for production; override for local API testing |

The default `EXPO_PUBLIC_API_BASE_URL` in `src/api.ts` falls back to the production Cloud Run endpoint, so the app works out of the box once the Firebase vars are filled in.

### API backend (`API/.env`)

Create `API/.env` from the example:

```bash
cp API/.env.example API/.env
```

| Variable | Purpose | Who to ask |
|---|---|---|
| `GCS_PROJECT_ID` | Google Cloud project ID for GCS and Firebase Admin | Team lead / GCP console |
| `GCS_CLIENT_EMAIL` | Service account email used to sign GCS URLs locally | Team lead (download the service account JSON) |
| `GCS_PRIVATE_KEY` | Private key from the service account JSON (paste with literal `\n`) | Team lead |
| `GCS_BUCKET_NAME` | GCS bucket for exercise videos (default: `aipeer_videos`) | Team lead |
| `GCS_MODEL_BUCKET` | GCS bucket for the LLM model file (default: `qwenfinetune`) | Team lead |
| `IDENTITY_PLATFORM_API_KEY` | Google Identity Platform API key for SMS 2FA | Firebase Console → Project Settings → General → Web API key |
| `PORT` | Port the Express server listens on (default: `3000`) | Leave as `3000` for local dev |
| `NODE_ENV` | Set to `development` locally | Leave as `development` |

On Cloud Run, `GCS_PRIVATE_KEY` is absent and Application Default Credentials are used automatically. Locally, the three `GCS_*` credential vars are required to generate signed URLs for videos and the LLM model.

### Firebase Functions (`functions/`)

The Cloud Function reads REDCap config from a Firestore document at `config/redcap`. There are no `.env` file secrets for Functions — the function uses Application Default Credentials via `admin.initializeApp()`. To run the emulator locally, set the credentials env var:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account.json
```

Confirm the `config/redcap` document exists in the `ai-peer` Firestore database with `apiToken` and `apiUrl` fields. Ask the team lead for the REDCap API token — it lives only in Firestore, not in any file in the repo.

---

## First run — iOS (recommended)

1. Start Metro bundler in one terminal:

    ```bash
    cd front-end/AI-PEER
    npx expo start
    ```

    Leave this running. Metro serves the JS bundle to the native app.

2. Open the Xcode workspace in a second terminal (or from Finder):

    ```bash
    npm run ios
    # equivalent to: open ios/AIPEER.xcworkspace
    ```

    Always open the `.xcworkspace`, never the `.xcodeproj`.

3. In Xcode, select your target device or simulator from the toolbar.

4. Press **Cmd+R** to build and run.

5. The first build takes several minutes (compiling MediaPipe, VisionCamera, Hermes). Subsequent builds are much faster.

**Do NOT use `npx expo run:ios`.** This is a bare workflow project. The Xcode path is the only reliable way to build — it runs all Podfile `post_install` hooks, including the C++20 injection that VisionCamera requires. `npx expo run:ios` can silently skip those hooks and produce a broken build.

JS-only changes hot-reload via Metro without a rebuild. Only Swift, Objective-C, or Podfile changes require a fresh Xcode build.

---

## First run — Android (optional)

```bash
cd front-end/AI-PEER

# Terminal 1: Metro
npx expo start

# Terminal 2: build and run
npm run android
```

Or open the `android/` directory directly in Android Studio and use the Run button.

For detailed Android environment setup, troubleshooting, and the doctor/clean scripts, see the **Android Troubleshooting** section in `front-end/AI-PEER/README.md`.

---

## First run — backend locally

The API has no `dev` script with auto-restart in `package.json`; run it directly with node or via nodemon (available as a dev dependency):

```bash
cd API
node server.js
# or for auto-restart on file changes:
npx nodemon server.js
```

The server starts on port 3000 (or `PORT` from `.env`). Confirm it is up:

```bash
curl http://localhost:3000/health
# expected: {"status":"OK","message":"AI PEER API is running"}
```

To point the app at your local API instead of production Cloud Run, set in `front-end/AI-PEER/.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Then restart Metro. When testing on a physical device (not a simulator), use your Mac's LAN IP instead of `localhost` — for example `http://192.168.x.x:3000`.

---

## First run — Firebase Functions locally

```bash
cd functions
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account.json
firebase emulators:start --only functions
```

The REDCap sync function is scheduled (runs at 2am daily in production). To invoke it manually in the emulator, use the Firebase Emulator UI at `http://localhost:4000` or call the Functions REST endpoint directly.

---

## Common first-run failures

**`pod install` fails with C++ template errors or module map issues**

Stale Clang module cache. From `front-end/AI-PEER`:

```bash
npm run ios:clean
```

This deintegrates pods, reinstalls them, and wipes `~/Library/Developer/Xcode/DerivedData`. Then in Xcode: **Product → Clean Build Folder** (Cmd+Shift+K), then build. See TROUBLESHOOTING.md for more detail.

**Xcode build fails with "Unknown type name 'requires'" or VisionCamera template errors**

Same root cause — C++20 not applied to all pod targets. Run `npm run ios:clean` from `front-end/AI-PEER`, then clean build folder in Xcode before rebuilding.

**`npm run ios:doctor` reports "Command Line Tools points at /Library/Developer/CommandLineTools"**

```bash
sudo xcode-select -s /Applications/Xcode.app
```

This is the most common silent cause of toolchain drift. Re-run `npm run ios:doctor` to confirm it clears. See TROUBLESHOOTING.md for the full doctor failure reference.

**App launches but cannot reach the API**

Check `EXPO_PUBLIC_API_BASE_URL` in `front-end/AI-PEER/.env`. If targeting a local server from a physical device, use your Mac's LAN IP (`http://192.168.x.x:3000`), not `localhost` — the device and the Mac are separate hosts.

**2FA code never arrives**

The SMS flow uses Google Identity Platform. Check that `IDENTITY_PLATFORM_API_KEY` is correctly set in `API/.env` and that Phone authentication is enabled in Firebase Console under Authentication → Sign-in method. See TROUBLESHOOTING.md for emulator-mode workarounds.

**`react-native-worklets-core` missing error during build**

```bash
cd front-end/AI-PEER && npm install
```

This package is a direct dependency required by the custom MediaPipe Swift plugin. If `npm install` was run before the package was listed in `package.json`, re-running it fixes the build.
