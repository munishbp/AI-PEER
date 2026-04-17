# AI-PEER Glossary

This reference covers the clinical, technical, and app-specific terms used across the AI-PEER project. Intended for sponsors and new team members — no prior medical or software background assumed.

---

## Clinical

### FES-I
**What it is:** A 7-question survey (Falls Efficacy Scale International) where each answer is scored 1–4 to measure how much a person fears falling.
**Why it matters here:** The app prompts users to complete it; the total score feeds the FRA matrix on the home screen as the "perceived risk" axis.

### TUG (Timed Up and Go)
**What it is:** A timed walking test: stand up from a chair, walk about 10 feet, turn, walk back, and sit down. Under 12 seconds is considered normal.
**Why it matters here:** One of two scored assessments in the app; MediaPipe tracks the person during the walk and the app records time and form.

### Chair Rise (30-Second Sit-to-Stand)
**What it is:** Count how many times a person can fully stand up from a chair in 30 seconds; measures lower-body strength and endurance.
**Why it matters here:** Tracked as the "chair-rise" assessment exercise; the rep counter and form analyzer both run during it.

### BTrackS
**What it is:** A physical balance test performed on separate hardware; produces a numeric fall-risk score that is entered into the system manually.
**Why it matters here:** Feeds the FRA matrix as the "physical risk" axis alongside the FES-I score.

### FRA (Fall Risk Assessment)
**What it is:** A 2x2 matrix that plots a user's physical fall risk (BTrackS) against their perceived fall risk (FES-I) to classify overall risk level.
**Why it matters here:** Displayed as a card on the home screen; gives clinicians and users a quick visual summary of where someone stands.

### Fall Risk
**What it is:** The likelihood that an older adult will fall, influenced by balance, strength, fear of falling, and movement quality.
**Why it matters here:** The entire app — assessments, exercises, AI chat, and data sync — is organized around measuring and reducing this risk.

---

## Vision

### MediaPipe
**What it is:** Google's open-source machine learning framework; the app uses it to detect body pose and hand position from the camera feed, entirely on-device.
**Why it matters here:** Every rep count, form check, and gesture confirmation depends on MediaPipe running frame by frame.

### Pose Landmarks
**What it is:** The 33 body-joint coordinates (x, y, depth, confidence) that MediaPipe outputs each frame; the app converts these to 17 standard COCO keypoints for form analysis.
**Why it matters here:** These coordinates are the raw input for every angle calculation and form rule in the exercise pipeline.

### Skeleton Overlay
**What it is:** The stick-figure drawn on top of the camera feed connecting the detected pose landmarks.
**Why it matters here:** Shows the user — and a demo observer — exactly what the app sees, making it easy to confirm the pose is being tracked correctly.

### Guide Overlay
**What it is:** A semi-transparent reference shape displayed over the camera so the user knows how to position themselves before starting.
**Why it matters here:** Reduces setup friction and bad-angle errors that would otherwise cause missed reps or inaccurate form scores.

### Rep Counter
**What it is:** The logic that counts completed movement cycles by checking whether the user has passed through a defined start angle and a defined end angle in sequence.
**Why it matters here:** Drives the rep display during every exercise set; each counted rep is also stored with its angle history for the activity record.

### Form Score
**What it is:** A 0–100 score computed as the percentage of camera frames during a session where all form checks passed simultaneously.
**Why it matters here:** Summarized in the post-exercise screen and stored in Firestore so coaches can track technique improvement over time.

### Gesture-Confirm (Palm-Up Start)
**What it is:** The user holds an open palm toward the camera for one second to signal they are ready; this replaces a fixed countdown timer.
**Why it matters here:** Lets older users start a tracking session hands-free and at their own pace without needing to tap a small button.

### FormAnalyzer
**What it is:** The module that reads the current pose and applies each exercise's rules — joint angles, alignment, range of motion — then emits any violations found.
**Why it matters here:** The single source of all real-time feedback cues ("knee caving", "lean forward") shown to the user during exercise.

### Rep-Zone Gating
**What it is:** A rule that suppresses form warnings while the user is actively transitioning through the expected movement range, only flagging errors in the resting positions between reps.
**Why it matters here:** Prevents false warnings mid-movement so the feedback the user hears is genuinely actionable.

### Feedback Event
**What it is:** A recorded form-check violation (message, severity, occurrence count, timestamps) accumulated across a session.
**Why it matters here:** Aggregated feedback events drive the post-exercise summary screen and are stored in Firestore for longitudinal review.

### Activity Record
**What it is:** The final document written to local storage and Firestore at the end of a completed session, containing sets, reps, angles, form score, feedback events, and frame count.
**Why it matters here:** The permanent data artifact for every exercise session; used by the activity tab, compliance tracking, and backend analytics.

### Temporal Smoother
**What it is:** A 300-millisecond filter that requires a form violation to be detected continuously before it surfaces to the user.
**Why it matters here:** Prevents single-frame keypoint glitches from triggering spurious audio warnings during an otherwise correct rep.

---

## App

### Bare React Native
**What it is:** React Native built through Xcode directly, without Expo's managed cloud toolchain; gives full access to native iOS and Android code.
**Why it matters here:** Required because the custom MediaPipe camera plugin and the on-device LLM library both need native code that Expo's managed workflow cannot include.

### expo-router
**What it is:** A file-based navigation library for React Native where the folder structure under `app/` defines the screen hierarchy, similar to Next.js.
**Why it matters here:** All screens — login, home tab, exercise session, AI chat — are routed through it.

### AsyncStorage
**What it is:** A simple key-value store that persists data locally on the device, similar to browser localStorage.
**Why it matters here:** Holds exercise history, FES-I results, user preferences, and auth tokens so the app works fully offline.

### i18n
**What it is:** Internationalization support; the app ships translation files for English, Spanish, and Haitian Creole bundled at build time.
**Why it matters here:** Ensures the app is usable by the diverse older-adult populations targeted by the research site.

### TTS (Text-to-Speech)
**What it is:** Audio read-aloud of on-screen instructions and exercise cues via `expo-speech`; language follows the user's selected locale (Haitian Creole falls back to a French voice).
**Why it matters here:** Critical accessibility feature for users with low vision or limited screen literacy; also calls out rep counts and form cues during exercise.

### llama.rn
**What it is:** A React Native library that runs a quantized LLM (language model) entirely on the phone's CPU, with no network call required.
**Why it matters here:** Powers the AI Chat tab using the finetuned Qwen model; all conversation data stays on the device for HIPAA compliance.

### Today's Workout
**What it is:** A daily-generated exercise plan that always includes all warmup and strength exercises plus three randomly-selected (but date-stable) balance exercises.
**Why it matters here:** The main entry point for users starting their daily exercise routine from the home screen.

### Post-Exercise Feedback Summary
**What it is:** The screen shown after a completed session listing the top three form issues ranked by severity and frequency.
**Why it matters here:** Gives users and coaches actionable takeaways without requiring them to parse raw session data.

### Compliance Tracking
**What it is:** A count of days with recorded exercise activity and an overall participation rate, stored per user in Firestore.
**Why it matters here:** Lets the research team monitor how consistently participants are using the app between clinical visits.

### GestureCountdownOverlay
**What it is:** The on-screen visual that shows the palm-up prompt and then counts down 5-4-3-2-1 before tracking begins.
**Why it matters here:** Bridges the gesture-confirm and countdown states so the user always knows what the app is waiting for.

---

## Backend

### Cloud Run
**What it is:** Google's serverless container platform; the AI-PEER Express API runs here and scales automatically with usage.
**Why it matters here:** The single backend service handling auth, video delivery, LLM model downloads, and exercise record storage.

### Firebase Custom Token
**What it is:** A short-lived token the backend generates after a successful SMS verification and hands back to the app to establish a Firebase session.
**Why it matters here:** The bridge between the app's phone-number/password login and Firebase's identity system.

### Firebase ID Token
**What it is:** A one-hour access token the app attaches as `Authorization: Bearer <token>` on every protected API call.
**Why it matters here:** The primary credential the backend checks before serving video URLs, saving activity records, or returning user data.

### Refresh Token (Custom)
**What it is:** A 30-day UUID stored in Firestore and on-device; used on app cold-start to get a new Firebase session without asking the user to log in again.
**Why it matters here:** Keeps users logged in across app restarts for up to a month without re-entering credentials.

### Verification Middleware
**What it is:** Express server code that intercepts every protected request, validates the Bearer token, and attaches the verified user ID for downstream controllers.
**Why it matters here:** The single enforcement point ensuring only the authenticated user can read or write their own data.

### Signed URL
**What it is:** A time-limited (one hour) link to a private file in Google Cloud Storage; the backend generates one per request.
**Why it matters here:** How exercise demo videos and the LLM model file are delivered to the app without making the storage bucket publicly accessible.

### Firestore Subcollection
**What it is:** A collection nested inside a Firestore document, e.g., `users/{uid}/activities/{date}`.
**Why it matters here:** Keeps each user's exercise history scoped under their own record, making permission rules and queries straightforward.

### Daily-Aggregated Document
**What it is:** One Firestore document per user per calendar day; individual activity entries are stored as fields inside it rather than as separate documents.
**Why it matters here:** Lets the app fetch an entire day's activity list in a single database read, keeping costs low.

### SMS 2FA (Two-Factor Authentication)
**What it is:** A six-digit code sent to the user's phone number via Google Identity Platform that must be entered to complete login or account creation.
**Why it matters here:** The only login method in the app; no email or password-only path exists.

---

## Infrastructure

### REDCap
**What it is:** A secure clinical data platform used by the research site to manage participant records and assessment scores.
**Why it matters here:** BTrackS scores and FES-I scores flow between REDCap and Firestore nightly via an automated sync; neither system overwrites app-submitted values.

### Firebase Functions
**What it is:** Scheduled serverless functions (in the `functions/` folder) that run automatically in the cloud without a persistent server.
**Why it matters here:** Run the nightly REDCap sync at 2 AM Eastern every day.

### GGUF
**What it is:** A compact model file format designed for efficient on-device LLM inference; the AI-PEER model file is about 1.2 GB in this format.
**Why it matters here:** The format llama.rn requires to load and run the Qwen model locally on the phone.

### GCS (Google Cloud Storage)
**What it is:** Google's cloud file storage; AI-PEER uses two private buckets — one for exercise demo videos, one for the LLM model file.
**Why it matters here:** All media and model assets are served from here via short-lived signed URLs rather than bundled in the app.

### Cloud Build / Source Deploy
**What it is:** The mechanism that builds and deploys the API container to Cloud Run when a developer runs `gcloud run deploy --source .`.
**Why it matters here:** The standard deployment path for backend changes; no Dockerfile management required.

### PEER Framework System Prompt
**What it is:** The instruction text loaded into the on-device LLM that shapes its responses, focusing it on geriatric health and fall prevention guidance.
**Why it matters here:** Defines the AI Chat persona and constrains the model to clinically relevant topics.
