# AI-PEER Troubleshooting Runbook

On-call reference for build failures, runtime bugs, and integration issues.
Each entry follows the same format: what you see, how to confirm, how to fix.

---

## iOS build fails with C++20 clang module cache errors

### Symptom
Xcode build fails with errors like `Unknown type name 'requires'`, `JSArgT`, `ReturnT`, or
`fatal error: … module cache … clang … C++20` inside VisionCamera, react-native-worklets-core,
or one of the MediaPipe pods. Often only reproducible on a fresh clone or after a
`pod install` on a machine that previously had a C++17 build cached.

### Diagnosis
Look for the string `requires` or `JSArgT` in the build log. Confirm the error is inside a
pod target (not app code). Run the iOS doctor first — it surfaces the most common root causes
without touching anything:

```bash
cd front-end/AI-PEER
npm run ios:doctor
```

Common doctor failures that produce this symptom:
- "Command Line Tools points at /Library/Developer/CommandLineTools" — the most common silent
  cause; Xcode's toolchain and Command Line Tools can drift.
- Node version mismatch or `react-native-worklets-core` missing from `node_modules`.

The underlying cause: VisionCamera and related RN libraries use C++20 features (`requires`,
variable templates). The `ios/Podfile` `post_install` hook forces
`CLANG_CXX_LANGUAGE_STANDARD = c++20` on all pod targets (both pbxproj buildSettings and
.xcconfig files), but Xcode caches compiled headers in DerivedData and in the Clang module
cache — those caches can persist after Podfile changes and cause headers to be parsed against
an older standard.

### Fix

Step 1 — re-point Command Line Tools at Xcode if the doctor flagged it:

```bash
sudo xcode-select -s /Applications/Xcode.app
```

Step 2 — wipe the Clang module cache and DerivedData, then clean and rebuild:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Caches/org.llvm.clang/ModuleCache
```

Then in Xcode: **Product → Clean Build Folder** (Cmd+Shift+K), then Cmd+R.

If that is not enough, run the one-command recovery script (deintegrates Pods, reinstalls,
wipes DerivedData):

```bash
cd front-end/AI-PEER
npm run ios:clean
```

After it finishes, open `ios/AIPEER.xcworkspace`, clean build folder, rebuild. See
`front-end/AI-PEER/README.md` (iOS Troubleshooting section) for fuller context on why this
happens and what `ios:clean` does internally.

> Note: `ios:clean` wipes DerivedData for all Xcode projects on this machine, not just AI-PEER.

---

## Gradle worker daemon OOM on Android

### Symptom
Android build freezes partway through, then exits with a message containing
`Fail to run Gradle Worker Daemon` or an OOM heap dump. Most often hits during
`:react-native-screens:compileReleaseJavaWithJavac` or one of the CMake compile tasks for
VisionCamera / reanimated / worklets-core / llama.rn.

### Diagnosis
Run the Android doctor first:

```bash
cd front-end/AI-PEER
npm run android:doctor
```

The doctor checks JDK version, `JAVA_HOME`, `ANDROID_HOME`/`ANDROID_SDK_ROOT`, Gradle wrapper,
`gradle.properties`, and daemon health. The worker daemon failure mode almost always means the
OS could not fork a worker JVM due to OOM, wrong JDK on PATH, or a zombie daemon.

If the doctor passes and the failure is specifically the daemon running out of heap, confirm by
checking the `org.gradle.jvmargs` line in
`front-end/AI-PEER/android/gradle.properties`. The project ships with:

```
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError
```

This was bumped from `-Xmx2048m` after a teammate hit the failure on a fresh clone. If this
line was reverted or is missing, that is the cause.

### Fix

Open `front-end/AI-PEER/android/gradle.properties` and confirm (or restore) the jvmargs line:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError
```

On a machine with less than 8 GB free RAM, try `-Xmx2g` to reduce per-daemon footprint.
Then clean and retry:

```bash
cd front-end/AI-PEER
npm run android:clean
npm run android
```

---

## Authenticated API calls return 401 after the app has been open ~1 hour

### Symptom
POSTs to `/activities/complete` or any `/users/*` endpoint return `401 Unauthorized` after
roughly an hour of the app being open. The user has not logged out. Earlier calls in the same
session succeeded.

### Diagnosis
Firebase ID tokens expire after 1 hour. Code that calls `auth.currentUser.getIdToken()` without
passing `true` returns the stale cached value after expiry, and the backend auth middleware
rejects it. Confirm by noting the 401 correlates with session age (~60 minutes since login or
last token refresh).

### Fix
Before every authenticated POST, call `getIdToken(true)` to force a token refresh against
Firebase's internal refresh token. The pattern is in
`front-end/AI-PEER/src/exercise-activity-storage.ts`, `submitActivityToBackend`:

```ts
const freshToken = await auth.currentUser?.getIdToken(true);
if (!freshToken) return false;
```

Any other fetch call in the codebase that uses `getIdToken()` without `true` is a latent
version of this bug. Copy this pattern — call `auth.currentUser?.getIdToken(true)` inline
immediately before building the `Authorization` header, not from a cached state value.

The app's cold-start session restore path (`src/auth/AuthContext.tsx`, `restoreSession`) is a
separate system that reads from AsyncStorage on launch. The two mechanisms coexist and are not
redundant: `restoreSession` handles app cold starts; `getIdToken(true)` handles token expiry
during a live session.

---

## Pose detector produces no landmarks / skeleton overlay is blank

### Symptom
Camera feed is live and visible, but no skeleton keypoints render. The rep counter does not
increment. No crash or error in the Metro log.

### Diagnosis
The frame processor receives `null` from the native plugin and calls `handleOnJS(null, [])`,
which passes `null` to `VisionContext.handlePoseResult` — that path is silent by design.
Work through the checklist below to find the actual cause.

### Fix
Check each item in order:

1. **Camera permission** — go to iOS Settings → AI PEER → Camera. If permission is off, the
   camera feed shows a black screen but VisionCamera still emits frames; the plugin receives
   empty buffers and returns null.

2. **Native plugin registered** — the frame processor in
   `front-end/AI-PEER/src/vision/frameProcessor.ts` guards with
   `if (!poseLandmarkerPlugin) return`. The plugin is initialized at module load via
   `VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker', {})`. If the native plugin
   was not registered at app startup, this is null and every frame is silently skipped.
   Confirm registration in `front-end/AI-PEER/ios/AIPEER/AppDelegate.swift` (iOS) or
   `android/app/src/main/java/com/anonymous/aipeer/poselandmarker/PoseLandmarkerFrameProcessorPlugin.kt`
   (Android).

3. **Lighting and framing** — MediaPipe Pose Landmarker requires adequate contrast. The model
   has known failures with elderly users in dark clothing under poor lighting (see project
   demo notes from 2026-03-27). Ensure frontal or overhead lighting and that the user's full
   torso is visible in the viewfinder.

4. **User not in frame** — confirm the subject is visible from head to mid-calf.

5. **Model task files absent** — the `.task` bundles (`pose_landmarker_full.task`,
   `hand_landmarker.task`) must be present at `ios/AIPEER/` (iOS) and
   `android/app/src/main/assets/` (Android). If a clean build omitted them, the plugin
   initializes but returns no landmarks. Rebuild from Xcode after confirming they appear in
   the Xcode project navigator.

---

## Android-only: handedness and y-coordinate flip produce mirrored feedback

### Symptom
Rep counter fires on the wrong leg. Form feedback refers to left when it means right (or vice
versa). Open-palm gesture detection behaves inverted — back of hand passes, palm forward fails.
This only occurs on Android; the same build works correctly on iOS.

### Diagnosis
Android CameraX delivers the front camera buffer without pre-mirroring it (unlike iOS, which
pre-mirrors at capture). MediaPipe's landmark coordinates must therefore be adjusted differently
per platform in two places: the COCO label table (which landmark index maps to which body side)
and the Y-axis transform.

These two corrections are in `front-end/AI-PEER/src/vision/VisionService.ts`:
- `mapMediaPipeToPose` selects `MEDIAPIPE_TO_COCO_ANDROID` (non-swapped left/right) on
  Android and applies `y: 1 - lm.x` instead of `y: lm.x`.
- `mapMediaPipeToHands` applies the same Y-flip.

The Y-flip also inverts the sign of the 2D cross product computed in `detectOpenPalm`. Because
MediaPipe reports handedness correctly on Android (there is no label inversion — this was
confirmed on a Pixel 7 in April 2026), only the cross-product sign needs a platform branch.

Confirm the branch is present in
`front-end/AI-PEER/src/vision/VisionContext.tsx`, inside `detectOpenPalm`:

```ts
let expectedSign = hand.handedness === "Right" ? RIGHT_PALM_NORMAL_SIGN : -RIGHT_PALM_NORMAL_SIGN;
if (Platform.OS === 'android') expectedSign = -expectedSign;
```

### Fix
If this branch is missing or was reverted, re-add it. Also verify the `Platform.OS` branches in
`VisionService.ts` (`mapMediaPipeToPose` and `mapMediaPipeToHands`) are intact.

If form feedback is still mirrored after confirming the above, the suspect is the
`RIGHT_PALM_NORMAL_SIGN` constant in `VisionContext.tsx` — flip the sign of the
`Platform.OS === 'android'` negation. Do not change `RIGHT_PALM_NORMAL_SIGN` itself; it is the
iOS-calibrated baseline (currently `+1`).

---

## iOS C++ build hell (archive or Release config fails specifically)

### Symptom
Debug builds succeed but archiving (Product → Archive) or a Release scheme build fails with
C++ template errors. Or a fresh-clone teammate cannot get past `pod install`. Errors reference
`VisionCamera/FrameProcessorPlugin.h`, `react-native-worklets-core`, or MediaPipe C++ headers.

### Diagnosis
This is the same C++20 Clang module cache problem as the first entry, manifesting in Release
config or on a machine with a stale cache. Run:

```bash
cd front-end/AI-PEER
npm run ios:doctor
```

Also verify `react-native-worklets-core` is present in `node_modules` — VisionCamera's frame
processor support, and therefore the custom MediaPipe Swift plugin, will not compile without it:

```bash
ls front-end/AI-PEER/node_modules/react-native-worklets-core
```

### Fix

Start with the Clang module cache purge from entry 1:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Caches/org.llvm.clang/ModuleCache
```

Clean build in Xcode (Cmd+Shift+K) and rebuild. If that is not enough, deintegrate and
reinstall Pods:

```bash
cd front-end/AI-PEER/ios
pod deintegrate && pod install
```

As a last resort, run the full clean recovery:

```bash
cd front-end/AI-PEER
npm run ios:clean
```

Then reopen `ios/AIPEER.xcworkspace` (never the `.xcodeproj`), clean build folder, and
rebuild. Never build via `npx expo run:ios` on this project — the bare workflow requires
Xcode for reliable C++ flag injection through the Podfile `post_install` hook.

---

## Video signed URL expired (media won't load / 403 from GCS)

### Symptom
Exercise demo video fails to play. The loading spinner never resolves, or the video errors
immediately. Network inspector shows `403 Forbidden` from `storage.googleapis.com`.

### Diagnosis
Signed URLs are generated with a 1-hour TTL. In `API/services/GCS_Service.js`,
`generateSignedUrl` sets:

```js
expires: Date.now() + 60 * 60 * 1000
```

If the app cached the signed URL on first load and the user returns after an hour, the URL is
stale. Confirm by inspecting the `X-Goog-Expires` query parameter in the URL — it should be
in the future.

### Fix
Re-fetch the URL from the videos endpoint rather than caching it across app lifecycle events.

If newly generated URLs also 403:
1. Confirm `GCS_BUCKET_NAME` is set correctly in the Cloud Run environment.
2. Confirm the service account (`GCS_CLIENT_EMAIL`) has `roles/storage.objectViewer` on the
   bucket.
3. On Cloud Run, URL signing uses the IAM `signBlob` API (the `isCloudRun` branch in
   `GCS_Service.js`). The service account needs `roles/iam.serviceAccountTokenCreator` on
   itself. Grant it in GCP IAM if missing.
4. Locally, signing uses `GCS_PRIVATE_KEY` from `.env`. Confirm `.env` is populated from
   `.env.example`.

---

## Model download hangs or returns an invalid GGUF

### Symptom
The AI chat feature shows "Loading model..." indefinitely after a fresh install, or the app
crashes on first inference. The `ModelDownloadModal` progress bar sticks at 0% or partway
through.

### Diagnosis
The model is a ~1.2 GB Q4_K_M GGUF downloaded from a private GCS bucket via a signed URL
fetched from `/model`. Check Metro logs for output prefixed with
`'Fetching signed model URL from API...'` and `'Got signed URL, starting download...'`
in `front-end/AI-PEER/src/llm/modelDownloader.ts`.

Failure modes:
1. The `/model` signed URL fetch failed (network error or 401 from the API).
2. A prior interrupted download left a partial file. The downloader
   (`modelDownloader.ts`, `isModelDownloaded`) deletes files smaller than 90% of
   `MODEL_SIZE_BYTES` on next launch, but a force-quit mid-download can leave a stub that
   is just large enough to pass the check.
3. The `.gguf` blob was renamed or deleted from the GCS bucket.

### Fix
1. Verify the `/model` endpoint returns a `modelUrl`:
   ```bash
   curl -H "Authorization: Bearer <token>" https://<api-url>/model
   ```
2. If the URL is returned but the download stalls, log into GCP Console → Cloud Storage and
   confirm the `.gguf` blob exists with the filename matching `MODEL_FILENAME` in
   `front-end/AI-PEER/src/llm/config.ts`.
3. To force a clean re-download, clear app data on the device (Settings → General →
   iPhone Storage → AI PEER → Offload App or delete and reinstall).
4. On a fresh install the model has never been downloaded — the user must go through the
   download flow once. Confirm `ModelDownloadModal` is being triggered by `LLMContext` and
   is not being dismissed prematurely.

---

## Firestore partial update ignored (fields missing after write)

### Symptom
After a profile update or settings save, some user fields are missing when the document is
read back. The write appears to succeed (no error thrown), but the Firestore document has
fewer fields than expected — as if the entire document was overwritten with only the updated
fields.

### Diagnosis
This is the symptom of `.set()` without `{ merge: true }` on an existing document. A plain
`.set()` replaces the entire document. The regression was fixed on 2026-03-25 by switching
`updateUser` in `API/services/firestore-functions.js` to `.update()`.

Confirm the current implementation uses `.update()`:

```js
async updateUser(id, data) {
  const res = await db.collection('users').doc(id).update(data);
  return res;
}
```

If the regression has reappeared, the function will show `.set(data)` without a merge option.

### Fix
In `API/services/firestore-functions.js`, restore `updateUser` to use `.update()`:

```js
async updateUser(id, data) {
  const res = await db.collection('users').doc(id).update(data);
  return res;
}
```

Alternatively, `.set(data, { merge: true })` is semantically equivalent for partial updates.
Do not use bare `.set(data)`.

The `writeUserActivity` function in the same file already uses the correct pattern —
`.set({ ... }, { merge: true })` — to avoid overwriting other entries in the daily activity
document.

After fixing, redeploy the API:

```bash
cd API
gcloud run deploy aipeer-api --source . --region us-central1 --no-invoker-iam-check \
  --service-account "munish@research-ai-peer-dev.iam.gserviceaccount.com"
```

---

## Reminder notifications don't fire after user revoked iOS notification permissions

### Symptom
Reminder notifications that previously worked stop firing silently. Toggling reminders on/off
in the Settings tab appears to work but no notifications arrive. No error is shown in the app.

### Diagnosis
iOS only shows the system permission prompt once. After the user revokes notification permission
in iOS Settings, `Notifications.requestPermissionsAsync()` returns `granted: false` without
surfacing any UI. `scheduleNotificationAsync` then silently no-ops.

The permission check is in
`front-end/AI-PEER/src/reminder-notifications.ts`, `requestReminderPermissions`. It returns
`false` when permission is denied, but the caller in `app/_layout.tsx` (`RootStack` `useEffect`)
currently swallows that return value — there is no prompt to re-enable.

Confirm the issue: in the Metro log, `scheduleReminderNotification` will not throw, but no
notification IDs will be returned to the system scheduler.

### Fix
1. Short-term: direct the user to iOS Settings → Notifications → AI PEER and re-enable
   notifications manually.

2. For a better experience, surface a prompt when `requestReminderPermissions()` returns
   `false`. The right locations are the Settings tab's reminder toggle UI and the
   `scheduleTestNotification` path in `src/reminder-notifications.ts`. Show a button that
   opens the system settings page:
   ```ts
   import { Linking } from 'react-native';
   Linking.openURL('app-settings:');
   ```
   The re-prompt logic belongs alongside the reminder UI in `app/(tabs)/settings.tsx` and in
   the `useEffect` in `app/_layout.tsx` that calls `requestReminderPermissions`.

---

## Dev: Metro bundler stuck / stale cache

### Symptom
JS changes are not reflected after saving, or Metro exits immediately on startup with a
cache-related error.

### Fix

```bash
cd front-end/AI-PEER
npx expo start -c
```

---

## Dev: Device not showing up in Xcode

### Symptom
Connected iPhone does not appear in the Xcode device selector.

### Fix
Unplug and replug the USB cable, then tap "Trust This Computer" on the device if prompted.
If the device still does not appear, restart Xcode. Ensure the device is running a supported
iOS version for the installed Xcode.
