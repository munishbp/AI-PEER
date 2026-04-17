# AI-PEER Vision Pipeline

Deep-dive reference for the camera-to-Firestore path. Audience: senior design team
members doing vision or ML work. Covers every layer from the camera hardware to the
activity record, plus a step-by-step guide for adding a new exercise.

---

## Overview

The vision pipeline begins with `react-native-vision-camera` delivering raw frames from
the device front camera to a JavaScript worklet. The worklet calls a custom native plugin
(`poseLandmarker`) that runs MediaPipe Pose Landmarker and Hand Landmarker synchronously
on each frame, returning 33 body landmarks and up to two hand-landmark sets. Results are
coordinate-transformed in `VisionService.ts` to a COCO-compatible space, then consumed by
`VisionContext.tsx`, which owns a four-state tracking machine: `idle`,
`waiting_for_gesture`, `countdown`, and `tracking`. In `waiting_for_gesture`, every frame
is tested against a geometric open-palm detector; once the user holds an open palm for the
required hold duration, a five-second TTS countdown fires, after which the rep counter and
form analyzer become active. On session end the screen assembles an `ExerciseCompletionRecord`,
calls `submitCompletedActivity`, which writes locally and POSTs to the Node backend, which
writes to Firestore at `users/{uid}/activities/{YYYY-MM-DD}`.

---

## Frame Path

One frame, end to end.

**1. Camera capture**
`react-native-vision-camera` delivers a frame buffer at the device's native FPS (typically
30 fps on the front camera) to the registered `frameProcessor`.

**2. Native plugin call (worklet thread)**
`front-end/AI-PEER/src/vision/frameProcessor.ts:55-76` — the `useFrameProcessor` hook
runs a worklet on every frame. Inside the worklet, `poseLandmarkerPlugin.call(frame)` calls
the native plugin synchronously. The plugin is registered once at module level on line 29:
```ts
const poseLandmarkerPlugin = VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker', {});
```
The plugin name is `'poseLandmarker'` on both iOS (Swift) and Android (Kotlin). Both
platform implementations were extended in-place to also run Hand Landmarker; the returned
object shape is `{ pose: [33 landmark dicts], hands: [[21 landmark dicts], ...] }`.

**3. JS thread delivery via `useRunOnJS`**
`frameProcessor.ts:53` calls `useRunOnJS(handleLandmarks, [])` to hop from the worklet
thread to the JS thread. `handleLandmarks` at lines 40-51 calls:
- `mapMediaPipeToPose(rawPose)` — converts 33 MediaPipe landmarks to a 17-keypoint COCO
  `Pose` object (`VisionService.ts:113-133`)
- `mapMediaPipeToHands(rawHands)` — converts raw hand arrays to typed `Hand[]` objects
  with the same coordinate transform (`VisionService.ts:149-177`)

The result is forwarded to `onPoseRef.current(pose, hands)`, which is wired to
`VisionContext.handlePoseResult`.

**4. VisionContext processes the frame**
`VisionContext.tsx:280-341` — `handlePoseResult` branches on `trackingModeRef.current`:
- `waiting_for_gesture`: runs `detectStartGesture(hands)` (open-palm check). No form
  analysis; the skeleton is still updated so the user gets camera feedback.
- `countdown`: pose-only update; rep counter and form analysis are dormant.
- `tracking`: calls `analyzePose(pose, exerciseId, rules)` from `FormAnalyzer.ts`, applies
  the 300 ms violation smoother (`smoothViolations`, lines 563-592), then calls
  `repCounterRef.current.update(pose)`.

State updates are throttled to ~5 Hz (`STATE_UPDATE_INTERVAL = 200` ms, line 79) to avoid
re-rendering every consumer on every camera frame.

**5. Downstream consumers re-render**
React sees the `state.currentPose` / `state.currentFeedback` change and re-renders:
- `SkeletonOverlay` (`src/vision/components/SkeletonOverlay.tsx:40-124`) — projects 17
  keypoints to screen-space SVG circles and bones, color-coded by `FormFeedback.violations`.
  Memoized on `pose.timestamp`, so it only repaints when a new frame arrives.
- `GuideOverlay` (`src/vision/components/GuideOverlay.tsx:73-222`) — draws exercise-specific
  target arcs (angle checks), dashed lines (alignment checks), and arrows (position checks)
  onto the same SVG layer. Reads `ExerciseRule.checks` via `getExerciseRules(exerciseId)`.
- Form score badge and violation banners — rendered inline in each session screen
  (`chair-rise-test.tsx:409-435`).
- `repCount` state triggers the rep counter display and TTS announcement.

---

## iOS vs Android Differences (Known Gotchas)

### Coordinate transform and label tables

MediaPipe delivers landmarks in the raw sensor frame. On iOS the front camera buffer arrives
in landscape-right and is pre-mirrored by the OS, so `mapMediaPipeToPose` applies a transpose
`(x: lm.y, y: lm.x)` to rotate to portrait, and the iOS label table
(`MEDIAPIPE_TO_COCO_IOS`, `VisionService.ts:22-40`) swaps left/right labels to account for
the mirror so that `right_wrist` tracks the user's actual right wrist.

On Android, CameraX delivers the buffer without pre-mirroring and in the opposite vertical
orientation, so `mapMediaPipeToPose` applies a transpose with a Y-flip `(x: lm.y, y: 1 - lm.x)`
(`VisionService.ts:116-129`). The same Y-flip is applied to hands in `mapMediaPipeToHands`
(`VisionService.ts:161-165`). Because the Android buffer is not pre-mirrored, MediaPipe's
left/right labels already match the user's body; the Android label table
(`MEDIAPIPE_TO_COCO_ANDROID`, `VisionService.ts:42-60`) therefore uses the natural (non-swapped)
mapping.

### The Android palm-normal sign bug

The open-palm check (`detectOpenPalm`, `VisionContext.tsx:495-549`) validates that the palm
faces the camera by computing the 2D cross product of `(wrist→index_MCP) × (wrist→pinky_MCP)`.
The sign of that cross product depends on which anatomical hand it is (left vs right are mirror
images), so the code scales it by `RIGHT_PALM_NORMAL_SIGN` and then branches on `hand.handedness`.

**The bug:** an earlier version assumed Android's handedness labels were inverted (because
MediaPipe's selfie-camera convention mismatches CameraX's non-mirrored buffer) and that this
inversion would cancel the Y-flip sign reversal, leaving the net result the same as iOS with
no platform branch needed. Pixel 7 device testing in April 2026 disproved this. MediaPipe
reports handedness correctly on Android; only the Y-flip inverts the cross-product sign. Without
a Platform branch, the detector ran inverted on Android: back-of-hand passed, palm-forward failed.

**The fix** is at `VisionContext.tsx:543-544`:
```ts
if (Platform.OS === 'android') expectedSign = -expectedSign;
```
This negates the expected sign before comparing to the measured cross product, restoring correct
detection on Android. The constant `RIGHT_PALM_NORMAL_SIGN = 1` (`VisionContext.tsx:463`) is
the iOS-calibrated baseline. If gesture detection ever regresses on a new Android device or form
factor, this is the first place to check.

### iOS C++ build fragility

The iOS native plugin compiles against C++20. The root problem is that CocoaPods only injects
`CLANG_CXX_LANGUAGE_STANDARD = c++20` on the main app target, not on pod targets or their
xcconfigs. Any teammate whose Xcode resolves a pod xcconfig that still says `c++17` or
`gnu++14` gets 14+ template errors (`Unknown type name 'requires'`, `JSArgT`, `ReturnT`).

The fix lives in the Podfile `post_install` hook
(`front-end/AI-PEER/ios/Podfile`, lines ~60-82): it iterates all pod targets and forces
`c++20` in their build settings, then regex-patches `.xcconfig` files. This is covered in
the project memory file at
`/Users/munish/.claude/projects/-Users-munish-Desktop-AI-PEER/memory/project_vision_pipeline_gotchas.md`,
items 2-3. If the C++ template errors come back, run:
```
bash front-end/AI-PEER/scripts/ios-doctor.sh
```

Note: `TROUBLESHOOTING.md` at the repo root is currently a stub with placeholder text.
The authoritative runbook for native plugin issues is the memory file above.

---

## Gesture-Confirm Flow (Open-Palm Start)

Every session screen calls `startGestureWatch(exerciseId)` instead of `startTracking` so
the camera activates while the user positions themselves, and the session starts hands-free.

**Detection logic**
`detectOpenPalm` (`VisionContext.tsx:495-549`) runs five checks on each detected hand:
1. All four non-thumb fingers extended in 3D (direct/path ratio >= `fingerExtension` threshold).
2. All four fingertips above the wrist in image Y (rejects upside-down hands).
3. Thumb extended beyond `thumbReachRatio * handSize` (rejects fist-with-fingers-out).
4. Palm normal faces the camera (cross-product sign check, with the Android branch described
   above).

`detectStartGesture` (`VisionContext.tsx:552-557`) returns true if any detected hand passes.

**Hold timing**
The open palm must be sustained continuously for `activePalmThresholds.holdMs` milliseconds
(default `DEFAULT_GESTURE_HOLD_MS = 1000` ms, `VisionContext.tsx:87-90`). Each frame that
fails resets `gestureFirstSeenAtRef` to null (`VisionContext.tsx:291-300`). Single-frame
detection glitches therefore never trigger the countdown.

**TUG threshold relaxation**
TUG runs the phone ~10 ft from the user instead of the standard ~6 ft, so the hand covers
fewer pixels and the strict defaults reject real open-palm frames. `tug-test.tsx:115-120`
relaxes all thresholds on mount:
```ts
setPalmThresholds({
  fingerExtension: 0.75,
  minExtendedFingers: 2,
  thumbReachRatio: 0.8,
  holdMs: 500,
});
```
`resetPalmThresholds()` is called on unmount (`tug-test.tsx:121-123`) so exercise-session
and chair-rise continue to see the strict defaults. Both functions are exported from
`VisionContext.tsx:438-444`.

**Countdown and TTS**
Once the hold threshold is met, `beginCountdown` (`VisionContext.tsx:217-244`) is called.
It sets `trackingMode` to `'countdown'` and schedules a setTimeout ladder for ticks 5 through 1.
`GestureCountdownOverlay` (`components/GestureCountdownOverlay.tsx:27-77`) renders the big
number overlay and calls `speak(String(countdownSecondsLeft))` on each tick (line 47).
The waiting-state prompt is spoken once when `trackingMode` flips to `'waiting_for_gesture'`
(line 37). Both TTS calls go through `src/tts.ts:speak`, which wraps `Speech.speak` with
the correct locale. Do not call `Speech.speak` directly — the wrapper handles the `ht`
(Haitian Creole) to `fr-FR` fallback and locale wiring.

On the final tick, `enterTrackingMode(exerciseId)` flips `trackingMode` to `'tracking'`
and initializes `RepCounter`.

---

## Per-Exercise Rule Schema

Exercise rules are plain TypeScript objects, no DSL. They live under
`front-end/AI-PEER/src/vision/exercises/` organized by category subdirectory, and are
registered in `src/vision/exercises/index.ts:50-86` under the exported `exerciseRegistry`
record. `getExerciseRules(id)` is the only lookup function (line 92).

Each rule file exports an `ExerciseRule` object (`exercises/types.ts:116-137`). Typical
fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | `string` | Registry key, e.g. `'strength-1'`, `'assessment-1'` |
| `name` | `string` | Display name |
| `category` | `'assessment' \| 'warmup' \| 'strength' \| 'balance'` | Grouping |
| `checks` | `FormCheck[]` | Array of angle / alignment / position checks (see below) |
| `repConfig` | `RepConfig \| undefined` | Rep-counting config (absent for timed exercises) |
| `timerSeconds` | `number \| undefined` | Set duration for timed exercises |
| `totalSets` | `number \| undefined` | Defaults to 3 if absent |
| `unilateral` | `boolean \| undefined` | True for left-then-right exercises |
| `cameraPrompt` | `string \| undefined` | Shown to user before the session starts |

**`repConfig` fields** (`exercises/types.ts:94-113`): `mode` (`'angle'` / `'distance'` /
`'angle3d'`), `keypoints` triplet (vertex is the middle element in angle mode), optional
`secondaryKeypoints` triplet for bilateral averaging, `startMin`/`startMax`/`endMin`/`endMax`
(rep zone gates in degrees or normalized distance), `targetReps`.

**`FormCheck` union** (`exercises/types.ts:92`): three active variants:
- `AngleCheck` — three keypoints (vertex is middle), `min`/`max` in degrees, optional
  `severityThresholds` for graded mild/moderate/severe output, optional `gateOnRepZones`
  to silence the check when the user is resting in a rep zone.
- `AlignmentCheck` — two keypoints, `direction: 'vertical' | 'horizontal'`, `tolerance` in
  degrees, optional `severityThresholds`.
- `PositionCheck` — one keypoint relative to a reference, `relation:
  'above' | 'below' | 'left_of' | 'right_of'`, fixed severity.

Two concrete examples:

`src/vision/exercises/strength/kneeExtensor.ts` — the knee extensor starts at 50-125 deg
(seated), ends at 145-180 deg (extended), targets 10 reps per set, `unilateral: true`,
and has five checks: full extension gate, back straight, hips level, shoulders level, head up.

`src/vision/exercises/assessment/chairRise.ts` — assessment category, `mode: 'angle3d'`
(uses the z coordinate to handle the user facing the camera), `targetReps: 30` (the 30 s
timer drives the stop, not the rep cap), checks for arms-crossed wrist position, full
bilateral leg extension, straight back, head up, and level hips and shoulders.

---

## How to Add a New Exercise

1. **Create the rule file.** Pick the closest existing exercise as a template. For a
   strength exercise, copy `src/vision/exercises/strength/kneeExtensor.ts`. Place the new
   file at `src/vision/exercises/<category>/<exercise-id>.ts`. The `id` field must be unique
   within the registry (e.g., `'strength-6'`).

2. **Register it.** Open `src/vision/exercises/index.ts`. Add an import line alongside the
   other imports for the category. Add an entry to `exerciseRegistry` (lines 50-86) mapping
   the id string to the exported rules object.

3. **Add translation keys.** The exercise name and any screen-specific strings go under the
   appropriate namespace in `src/locales/{en,es,ht}/translation.json`. Exercise session
   strings live under the `exercise-session` or `exercise` namespace; assessment-specific
   strings use the screen's own namespace (`chair-rise-test`, `tug-test`).

4. **(Optional) Media assets.** If the exercise has a demo video or thumbnail hosted in GCS,
   update the media mapping in `src/video.ts` to point to the new asset.

5. **Test.** Navigate to `app/(tabs)/exercise-session.tsx` via the route
   `/exercise-session?video=<exercise-id>`. The session screen reads the ID from query params,
   calls `getExerciseRules`, and drives the full gesture to countdown to tracking to summary
   flow. Verify the rep counter increments correctly, form feedback fires for intentional
   mistakes, and the session record saves.

6. **Assessment type.** If the exercise is an assessment (TUG/Chair Rise pattern), implement
   a dedicated screen under `app/(tabs)/` modeled on `chair-rise-test.tsx`. Call
   `submitCompletedActivity` with `category: "assessment"`. The record writes to
   `users/{uid}/activities/{YYYY-MM-DD}` with the same Firestore path as all other
   activities — no special handling needed.

---

## FormAnalyzer

`src/vision/FormAnalyzer.ts` is a pure function. `analyzePose(pose, exerciseId, overrideRules?)`
iterates `rules.checks` and dispatches to `checkAngle`, `checkAlignment`, or `checkPosition`
for each check. Each check either returns null (pass) or a `FormViolation` with `bodyPart`,
`message`, and `severity`.

**Angle check** (`FormAnalyzer.ts:57-91`): computes the joint angle at the middle keypoint
using `calculateAngle`. If `gateOnRepZones` is set on the check, the violation is suppressed
when the current angle falls inside the rep's start or end zone (lines 70-76) — this prevents
"extend your leg fully" from firing while the user is legitimately resting at the bottom of
the movement. Severity is graded by `gradeSeverity` (lines 131-142): if `severityThresholds`
is set on the check, degrees-outside-range determines mild/moderate/severe; otherwise the
check's fixed `severity` field is used.

**Alignment check** (`FormAnalyzer.ts:93-128`): computes angle-from-vertical or
angle-from-horizontal between two keypoints. Fires when that angle exceeds `tolerance`.

**Position check** (`FormAnalyzer.ts:144-173`): simple above/below/left_of/right_of test.

**Per-frame score** (`FormAnalyzer.ts:183-185`): binary — 100 if all checks passed, 0 if
any failed. VisionContext recomputes this from the smoothed violation list so a single-frame
keypoint glitch does not drop the score.

**300 ms violation smoother** (`VisionContext.tsx:563-592`): `smoothViolations` takes the
raw violation list, a `startTimes` map (keyed by violation message), and the current
timestamp. A violation is only surfaced if it has been continuously failing for at least
`VIOLATION_SMOOTHING_MS = 300` ms (line 84). Violations are keyed by message, so bilateral
exercises with the same feedback string on both sides collapse to one entry — matching how
`feedbackEvents` are keyed on the screen side.

**Feedback event aggregation** (session screen, `chair-rise-test.tsx:126-149`): each frame
where `isTracking` is true increments `violationCountRef.current[message].count` and updates
`lastAt` (ms since session start). `firstAt` is set on first occurrence. At session end,
`Object.values(violationCountRef.current)` becomes the `feedbackEvents` array in the record.

**`avgScore`** is the arithmetic mean of all per-frame scores collected into `scoresRef.current`
while `isTracking` is true (`handleStop`, `chair-rise-test.tsx:193-197`). Because each score
is 100 or 0, the mean equals the fraction of frames with no form violations — "percentage of
clean frames."

---

## Activity Record Assembly

At session end (e.g., `handleStop` in `chair-rise-test.tsx:182-243`), the screen:

1. Calls `getRepHistory()` on the VisionContext before `stopTracking()` (which resets the
   counter and discards history).
2. Computes `avgScore` and `framesAnalyzed` from the per-frame score accumulator.
3. Calls `submitCompletedActivity(input)` (`src/exercise-activity-storage.ts:300-316`) with
   a `NewActivityInput` object.

`submitCompletedActivity` calls `buildRecord(input)` (lines 214-243), which generates a UUID
`id` and ISO `completedAt`, then:
- Writes the record to `AsyncStorage` under `exercise_activity_records_v1` (always, before
  the network call, as the primary persistence).
- Fires `submitActivityToBackend(record)` as fire-and-forget (line 313). Failures are logged
  but not surfaced to the user.

**`ExerciseCompletionRecord` shape** (`exercise-activity-storage.ts:43-82`):

| Field | Description |
|---|---|
| `id` | UUID string |
| `exerciseId` | Rule ID, e.g. `'assessment-1'` |
| `exerciseName` | Display name |
| `category` | `'assessment' \| 'warmup' \| 'strength' \| 'balance' \| 'other'` |
| `completedAt` | ISO 8601 string |
| `setsCompleted` / `setsTarget` | Set counts |
| `durationSec` | Total session wall time |
| `totalReps` / `repsPerSet` | Rep counts |
| `unilateral` | True for L/R-split exercises |
| `angleSummaries` | `AngleSummarySet[]` — per-set, per-rep start/end/peak angle history |
| `feedbackEvents` | Aggregated form violations: message, severity, count, firstAt, lastAt |
| `avgScore` | Mean per-frame form score (0-100) or null |
| `framesAnalyzed` | Total frames where pose was analyzed |
| `fesI` / `questionnaireAnswers` | Present only for questionnaire assessment records |

**Backend route** (`API/controllers/activitiesController.js:31-63`): `POST /activities/complete`
validates required fields then calls `activityService.writeUserActivity(userId, record)`.
The `userId` always comes from the verified Firebase token (`req.user.uid`), never from the
request body.

**Firestore write** (`API/services/firestore-functions.js:81-95`):
```js
const dayKey = activityRecord.completedAt.slice(0, 10); // "YYYY-MM-DD"
const ref = db.collection('users').doc(userId).collection('activities').doc(dayKey);
await ref.set({ [`entries.${activityRecord.id}`]: activityRecord }, { merge: true });
```
Path: `users/{uid}/activities/{YYYY-MM-DD}`, field: `entries.<id>`. The merge-set is
idempotent — a retry with the same `id` overwrites the same key. This design collapses ~1800
docs/year down to ~365 daily documents.

---

## Sequence Diagram — Chair Rise

```
User                   App (React Native)               Backend (Node)    Firestore
 |                            |                               |                |
 |-- taps Balance Test ------>|                               |                |
 |                            |-- router.navigate(balance-test.tsx)            |
 |                            |                               |                |
 |-- taps Chair Rise -------->|                               |                |
 |                            |-- navigate(video-confirm)     |                |
 |                            |-- navigate(chair-rise-test)   |                |
 |                            |                               |                |
 |                            |-- useCameraPermission()       |                |
 |<-- permission prompt -------|                               |                |
 |-- grants permission ------->|                               |                |
 |                            |-- Camera activates, frameProcessor wired       |
 |                            |                               |                |
 |-- taps Start Test -------->|                               |                |
 |                            |-- startGestureWatch("assessment-1")            |
 |                            |   trackingMode = 'waiting_for_gesture'         |
 |                            |                               |                |
 |<-- GestureCountdownOverlay: "Show open palm" (TTS via src/tts.ts:speak)     |
 |                            |                               |                |
 |-- raises open palm ------->|                               |                |
 |                            |-- detectOpenPalm() passes for 1000 ms          |
 |                            |-- beginCountdown()             |                |
 |                            |   trackingMode = 'countdown'  |                |
 |                            |                               |                |
 |<-- TTS: "5", "4", "3", "2", "1" (GestureCountdownOverlay, speak() each tick)|
 |                            |                               |                |
 |                            |-- enterTrackingMode("assessment-1")             |
 |                            |   RepCounter initialized (mode: angle3d)       |
 |                            |   trackingMode = 'tracking'   |                |
 |                            |   30s interval timer starts   |                |
 |                            |                               |                |
 |<-- TTS: chair-rise-test.ttsStart (speak())                  |                |
 |                            |                               |                |
 |-- sit-to-stand reps ------->|                               |                |
 |                            |-- MediaPipe pose per frame     |                |
 |                            |-- RepCounter.update(pose): angle3d             |
 |                            |-- repCount increments          |                |
 |<-- TTS: "1", "2", ... ----- (speak(String(repCount)) on each new rep)       |
 |                            |                               |                |
 |                            |-- secondsLeft hits 0           |                |
 |                            |-- handleStop()                |                |
 |                            |   getRepHistory() before stopTracking()        |
 |                            |   avgScore = mean(scoresRef)  |                |
 |                            |   buildRecord() -> ExerciseCompletionRecord    |
 |                            |-- submitCompletedActivity()    |                |
 |                            |   AsyncStorage.setItem() (local write first)   |
 |                            |-- submitActivityToBackend()    |                |
 |                            |   POST /activities/complete -->|                |
 |                            |                               |-- validateActivityRecord()
 |                            |                               |-- writeUserActivity()
 |                            |                               |   path: users/{uid}/
 |                            |                               |   activities/{YYYY-MM-DD}
 |                            |                               |   entries.<id> = record -->|
 |                            |                               |                |-- merge set ✓
 |                            |<-- 201 { success: true } -----|                |
 |                            |                               |                |
 |<-- summary card with rep count + band label                 |                |
     (>= 12 reps: Above Average, >= 8: Normal, < 8: Below Average)
     TTS: speak(t("chair-rise-test.ttsComplete", { reps, band }))
```
