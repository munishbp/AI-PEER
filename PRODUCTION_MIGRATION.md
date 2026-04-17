# AI-PEER Production Migration Plan

This document is a complete hand-off to the UCF College of Medicine (CoM) IT team. It describes everything required to stand up AI-PEER in a production Google Cloud environment and cut over from the current development project (`research-ai-peer-dev`).

After cutover, CoM IT owns the system outright: infrastructure, deployments, monitoring, on-call, App Store and Play Console presence, and any future code changes. The student engineering team supports the migration up to the point of cutover, then steps away. This plan is written so that a CoM IT administrator can execute it without further contact with the student team.

The plan assumes a clean, parallel stand-up: a new GCP project with its own Firebase project, service accounts, buckets, Firestore database, and deployments. Data in the dev environment will not be migrated by default (see the "Data migration" section).

## 1. Current (dev) state inventory

Confirmed live against `research-ai-peer-dev` via `gcloud` on 2026-04-17.

| Asset | Value |
|---|---|
| GCP project ID | `research-ai-peer-dev` |
| GCP project number | `596437694331` |
| Firestore database | `ai-peer` (named database, not `(default)`), location `nam5`, Firestore Native mode |
| Cloud Run API service | `aipeer-api` in `us-central1`, URL `https://aipeer-api-596437694331.us-central1.run.app` |
| Cloud Run function wrapper | `redcapsync` (Gen2 Firebase function exposed as Cloud Run) |
| Cloud Scheduler job | `firebase-schedule-redcapSync-us-central1`, cron `0 2 * * *` America/New_York |
| GCS bucket (videos) | `aipeer_videos` in US multi-region |
| GCS bucket (LLM model) | `qwenfinetune` in US multi-region, object `models/Qwen3.5-2B-aipeer-Q4_K_M.gguf` |
| Secret Manager secret | `gcs-private-key` (us-central1) |
| Cloud Run runtime SA | `munish@research-ai-peer-dev.iam.gserviceaccount.com` |
| Functions runtime SA | same `munish@...` SA (referenced in `functions/index.js:20`) |

Enabled APIs on the dev project include: Firestore, Cloud Storage, Cloud Run, Cloud Functions, Identity Toolkit (Identity Platform for SMS 2FA), IAM, IAM Credentials, Cloud Scheduler, Pub/Sub, Secret Manager, Cloud Logging, Cloud Monitoring, Artifact Registry, Cloud Build, Firebase Management, Firebase Installations, Firestore Rules, Firebase Remote Config, FCM, Eventarc.

## 2. Decisions CoM IT needs to make up front

These choices block everything else and should be confirmed before any provisioning begins.

1. **Production GCP project ID.** Suggested: `research-ai-peer-prod`. It must be unique across Google Cloud and cannot be changed later.
2. **Billing account.** Must be a CoM-owned billing account covered by a current Google Cloud BAA (see section 3).
3. **Region.** Recommended: `us-central1` (matches dev, keeps latency predictable for Florida clinic traffic). Firestore multi-region recommended: `nam5` (US).
4. **Ownership model.** Recommended: a dedicated CoM Google Group (for example `aipeer-prod-owners@ucf.edu`) granted Owner on the project, plus a narrower group (`aipeer-prod-admins@ucf.edu`) granted Editor. No individual users granted Owner directly. The student team is not granted any role on the production project at any point.
5. **Data migration.** Fresh start is the recommended default; no patient data lives in the dev project today. If CoM wants dev data carried over, flag early because it adds a Firestore export / GCS backup step that the student team can assist with before cutover.
6. **Apple and Google publisher identity.** Production mobile builds must ship under CoM's Apple Developer team and Google Play organization. The student team's existing App Store Connect / Play Console entries will not be used. See section 11.
7. **Domain and SSL.** Cloud Run auto-issues a `*.a.run.app` URL. If CoM wants a branded domain (for example `api.aipeer.med.ucf.edu`), add Cloud Load Balancer plus a managed certificate; this is optional and can be deferred.

## 3. Compliance prerequisites

This project stores identifiable patient data. The repo's `Allowed BAA.txt` enumerates GCP services covered by UCF's BAA. Cross-referencing against what AI-PEER uses:

| Service | In use | On BAA list |
|---|---|---|
| Cloud Run | yes | yes |
| Cloud Firestore | yes | yes |
| Cloud Storage | yes | yes |
| Cloud Functions | yes | yes |
| Identity Platform (SMS 2FA) | yes | yes (Identity Platform) |
| Secret Manager | yes | yes |
| Cloud Scheduler | yes | yes |
| Cloud Logging | yes | yes |
| Cloud Monitoring | yes | yes |
| Cloud IAM | yes | yes |
| Pub/Sub | yes (Gen2 functions) | yes |
| Cloud Build | yes (used by `gcloud run deploy --source .`) | yes |
| Artifact Registry | yes (build output) | yes |

Every service AI-PEER touches is covered by the BAA list. No migration to replace a service is required for compliance.

Before provisioning begins, CoM IT should:

1. Confirm the production GCP project is attached to a billing account with an active BAA addendum accepted.
2. Confirm Access Transparency and Access Approval are enabled if CoM policy requires them (both are on the BAA list).
3. Decide whether to enable VPC Service Controls around the production project. Recommended for PHI workloads but requires additional routing work in Cloud Run.

## 4. Production architecture (target)

Same shape as dev, new tenancy.

```
 Mobile app (iOS / Android, signed by CoM)
    |
    | HTTPS (Firebase custom-token auth)
    v
 Cloud Run service: aipeer-api
    |------> Firestore (database: ai-peer)
    |------> Cloud Storage: aipeer-videos-prod     (signed URLs, 1-hour TTL)
    |------> Cloud Storage: aipeer-llm-models-prod (LLM model signed URL)
    |------> Identity Platform (SMS 2FA)
    |------> Firebase Admin SDK (custom tokens, token verification)

 Cloud Scheduler: 0 2 * * * ET
    |
    v
 Cloud Run function: redcapsync (Gen2)
    |------> Firestore (read users, write scores)
    |------> REDCap API (external, over HTTPS)

 Secret Manager
    |------> Identity Platform API key
    |------> REDCap API token
    |------> (no service account JSON keys; workload identity only)
```

## 5. Phase 1: Provision the production project

Performed by CoM IT with Organization-level permissions.

1. Create the GCP project.
   ```bash
   gcloud projects create research-ai-peer-prod \
     --name="AI-PEER Production" \
     --organization=<ucf-organization-id>
   ```
2. Attach a billing account.
   ```bash
   gcloud beta billing projects link research-ai-peer-prod \
     --billing-account=<billing-account-id>
   ```
3. Apply an environment tag. The dev project currently lacks this and gcloud warns about it on every call.
   ```bash
   gcloud resource-manager tags bindings create \
     --location=global \
     --parent=//cloudresourcemanager.googleapis.com/projects/research-ai-peer-prod \
     --tag-value=tagValues/<environment-production-tag-id>
   ```
4. Enable required APIs.
   ```bash
   gcloud services enable \
     firestore.googleapis.com storage.googleapis.com run.googleapis.com \
     cloudfunctions.googleapis.com cloudbuild.googleapis.com \
     artifactregistry.googleapis.com cloudscheduler.googleapis.com \
     pubsub.googleapis.com eventarc.googleapis.com \
     identitytoolkit.googleapis.com iamcredentials.googleapis.com \
     secretmanager.googleapis.com logging.googleapis.com monitoring.googleapis.com \
     firebase.googleapis.com firebaserules.googleapis.com \
     --project=research-ai-peer-prod
   ```
5. Attach the project to Firebase.
   ```bash
   firebase projects:addfirebase research-ai-peer-prod
   ```
6. Register an iOS app and an Android app in the Firebase console for the production project, using CoM's bundle identifiers (for example `edu.ucf.med.aipeer`). Download the resulting `GoogleService-Info.plist` and `google-services.json`. These replace the dev-era files inside `front-end/AI-PEER/ios/AIPEER/` and `front-end/AI-PEER/android/app/`.

## 6. Phase 2: Service accounts and IAM

Create three dedicated service accounts instead of reusing one named after an individual. Principle of least privilege.

| Name | Email | Purpose | Roles on prod project |
|---|---|---|---|
| API runtime | `aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com` | Cloud Run service `aipeer-api` runtime identity | `roles/datastore.user`, `roles/storage.objectViewer` (granted at the bucket level, not project-wide), `roles/iam.serviceAccountTokenCreator` on itself (for `signBlob`), `roles/firebaseauth.admin`, `roles/secretmanager.secretAccessor` |
| REDCap sync | `aipeer-redcap-sync@research-ai-peer-prod.iam.gserviceaccount.com` | Cloud Functions runtime identity for the scheduled REDCap sync | `roles/datastore.user`, `roles/secretmanager.secretAccessor` |
| CI/CD deployer | `aipeer-deployer@research-ai-peer-prod.iam.gserviceaccount.com` | Used by whatever deploys new code (GitHub Actions, Cloud Build trigger, or a manual `gcloud run deploy` invocation by a CoM IT admin) | `roles/run.admin`, `roles/iam.serviceAccountUser` (to act-as the runtime SAs), `roles/artifactregistry.writer`, `roles/cloudbuild.builds.editor`, `roles/cloudfunctions.developer`, `roles/firebase.admin` |

Create them:

```bash
gcloud iam service-accounts create aipeer-api \
  --display-name="AI-PEER API (Cloud Run runtime)" \
  --project=research-ai-peer-prod

gcloud iam service-accounts create aipeer-redcap-sync \
  --display-name="AI-PEER REDCap sync (Functions runtime)" \
  --project=research-ai-peer-prod

gcloud iam service-accounts create aipeer-deployer \
  --display-name="AI-PEER CI/CD deployer" \
  --project=research-ai-peer-prod
```

Grant project-level roles with `gcloud projects add-iam-policy-binding` per the table above. Grant bucket-scoped `storage.objectViewer` at the bucket level once the buckets exist in phase 3.

The `aipeer-api` service account also needs the `roles/iam.serviceAccountTokenCreator` role on itself so it can call `signBlob` for generating signed GCS URLs from inside Cloud Run. The existing dev code relies on this behavior; it is not optional.

```bash
gcloud iam service-accounts add-iam-policy-binding \
  aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com \
  --member="serviceAccount:aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=research-ai-peer-prod
```

Do not create service account JSON keys. All three SAs are attached to Google-managed runtimes (Cloud Run, Cloud Functions) or used via Workload Identity Federation from CI. JSON keys create rotation risk and are unnecessary.

Human-level access: all administrative access goes through the `aipeer-prod-owners@ucf.edu` and `aipeer-prod-admins@ucf.edu` groups defined in section 2. No individual users hold roles directly.

## 7. Phase 3: Data stores

### 7.1 Firestore

The dev project uses a **named** Firestore database called `ai-peer`, not the `(default)` database. The application code targets this name explicitly, so production must match.

```bash
gcloud firestore databases create \
  --database=ai-peer \
  --location=nam5 \
  --type=firestore-native \
  --project=research-ai-peer-prod
```

Collections the code writes to (from `API/services/firestore-functions.js` and `API/routes/authRoutes.js`):

- `users/{uid}`: user profile, phone, passwordHash, compliance fields.
- `users/{uid}/activities/{YYYY-MM-DD}`: subcollection with `entries.<activityId>` map (daily-aggregated session records).
- `verificationSessions/{phone}`: SMS cooldown and rate-limit state.
- `refreshTokens/{uuid}`: 30-day session tokens issued after successful SMS verify.
- `config/redcap`: single document holding REDCap API credentials (consumed by the scheduled function only).

Firestore security rules for this project are currently permissive because every write path goes through the Express API under the Admin SDK. Before go-live, commit a `firestore.rules` file that denies all client-side access (all reads/writes from outside the Admin SDK must fail) and deploy with `firebase deploy --only firestore:rules --project prod`.

Enable daily Firestore backups via the console or `gcloud firestore backups schedules create`. Recommended retention: 30 days. If CoM requires point-in-time recovery, Firestore PITR is a separate opt-in and adds cost.

### 7.2 Cloud Storage buckets

Two buckets, both in US multi-region to match dev. Use production-specific names so they cannot be confused with dev:

```bash
gcloud storage buckets create gs://aipeer-videos-prod \
  --location=US --uniform-bucket-level-access \
  --public-access-prevention \
  --project=research-ai-peer-prod

gcloud storage buckets create gs://aipeer-llm-models-prod \
  --location=US --uniform-bucket-level-access \
  --public-access-prevention \
  --project=research-ai-peer-prod
```

Grant the API runtime service account read access on each bucket:

```bash
gcloud storage buckets add-iam-policy-binding gs://aipeer-videos-prod \
  --member="serviceAccount:aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud storage buckets add-iam-policy-binding gs://aipeer-llm-models-prod \
  --member="serviceAccount:aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

Before cutover, the student team copies all content from dev buckets into the new prod buckets:

1. Every MP4 under `gs://aipeer_videos/` in the dev project into `gs://aipeer-videos-prod/` with the same object paths.
2. `gs://qwenfinetune/models/Qwen3.5-2B-aipeer-Q4_K_M.gguf` into `gs://aipeer-llm-models-prod/models/Qwen3.5-2B-aipeer-Q4_K_M.gguf`.

The copy runs once, from a machine authed into both projects, using commands like:

```bash
gcloud storage cp --recursive "gs://aipeer_videos/*" "gs://aipeer-videos-prod/"
gcloud storage cp "gs://qwenfinetune/models/Qwen3.5-2B-aipeer-Q4_K_M.gguf" \
  "gs://aipeer-llm-models-prod/models/Qwen3.5-2B-aipeer-Q4_K_M.gguf"
```

After cutover, CoM IT owns bucket management. Object lifecycle policies (for example a 30-day versioning retention) are optional and can be added whenever CoM decides.

### 7.3 Secret Manager

Three secrets to create in `us-central1`:

| Secret name | Value | Consumer |
|---|---|---|
| `identity-platform-api-key` | The Firebase Web API key used for the SMS send/verify REST endpoints | `aipeer-api` Cloud Run |
| `redcap-api-token` | REDCap API token issued by the CoM REDCap instance admin | `aipeer-redcap-sync` Function |
| `redcap-api-url` | The REDCap project URL (for example `https://redcap.med.ucf.edu/api/`) | `aipeer-redcap-sync` Function |

Example for the Identity Platform key:

```bash
printf "<VALUE>" | gcloud secrets create identity-platform-api-key \
  --data-file=- --replication-policy=user-managed --locations=us-central1 \
  --project=research-ai-peer-prod

gcloud secrets add-iam-policy-binding identity-platform-api-key \
  --member="serviceAccount:aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=research-ai-peer-prod
```

The dev project currently stores REDCap credentials inside the Firestore document `config/redcap`. Production should keep that pattern at launch to avoid code churn, but the REDCap token value written into that document should originate from Secret Manager so it can be rotated without touching Firestore.

**Important key-rotation note:** the current dev Cloud Run config exposes the Identity Platform API key as a plaintext env var value. During migration, rotate this key in the Firebase console (regenerate a new one specifically for production) and store the rotated value in Secret Manager. Do not reuse the dev key in production.

## 8. Phase 4: Code changes required

The student team will land these on a new branch `production-migration` off `main`, merge them into `main`, and tag `v1.0.0-prod` before the mobile-build step in phase 6.

### 8.1 Hard-coded project references to update

The grep target is `research-ai-peer-dev`. Most references are in documentation examples and can be left as-is; the blocking changes are:

| File | Line | Change |
|---|---|---|
| `.firebaserc` | existing `default` alias | Add a `prod` alias pointing at `research-ai-peer-prod`. Keep `default` as dev so accidental `firebase deploy` without `--project` does not hit prod. |
| `functions/index.js` | 20 | Replace the literal `munish@research-ai-peer-dev.iam.gserviceaccount.com` with a read from `process.env.FUNCTIONS_SA`, or remove the explicit service account line entirely and rely on the SA attached at deploy time. The latter is simpler. |
| `Training/slm/upload_to_gcs.py` | 52 | Not required at launch; training is done by the student team and the dev project is already suitable. Can be parameterized later if CoM takes over training. |
| `front-end/AI-PEER/.env` | new file | Populated at phase 6 with production Firebase web config and production Cloud Run URL. Not checked into git. |

### 8.2 Environment variables

The Cloud Run API service reads the following env vars (confirmed by `gcloud run services describe aipeer-api`):

| Variable | Dev value | Production value | Source |
|---|---|---|---|
| `GCS_PROJECT_ID` | `research-ai-peer-dev` | `research-ai-peer-prod` | `--set-env-vars` on deploy |
| `GCS_BUCKET_NAME` | `aipeer_videos` | `aipeer-videos-prod` | `--set-env-vars` on deploy |
| `GCS_MODEL_BUCKET` | `qwenfinetune` | `aipeer-llm-models-prod` | `--set-env-vars` on deploy |
| `GCS_CLIENT_EMAIL` | `munish@research-ai-peer-dev.iam.gserviceaccount.com` | unset in production (Cloud Run uses ADC from the attached SA) | n/a |
| `GCS_PRIVATE_KEY` | set in `.env` for local dev only | unset in production | n/a |
| `IDENTITY_PLATFORM_API_KEY` | plaintext env var on Cloud Run | Secret Manager reference `identity-platform-api-key:latest` | `--set-secrets` on deploy |
| `NODE_ENV` | `development` | `production` | `--set-env-vars` on deploy |
| `PORT` | unset (Cloud Run injects 8080) | unset | n/a |

The Functions service reads REDCap credentials from Firestore, so no additional env vars are required beyond what Firebase Functions injects automatically.

### 8.3 `.firebaserc` update

```json
{
  "projects": {
    "default": "research-ai-peer-dev",
    "prod": "research-ai-peer-prod"
  }
}
```

## 9. Phase 5: Deploy the API

Performed by a CoM IT admin (or the `aipeer-deployer` service account via Cloud Build / GitHub Actions).

```bash
cd API

gcloud run deploy aipeer-api \
  --source . \
  --project=research-ai-peer-prod \
  --region=us-central1 \
  --service-account=aipeer-api@research-ai-peer-prod.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --ingress=all \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=300 \
  --set-env-vars="GCS_PROJECT_ID=research-ai-peer-prod,GCS_BUCKET_NAME=aipeer-videos-prod,GCS_MODEL_BUCKET=aipeer-llm-models-prod,NODE_ENV=production" \
  --set-secrets="IDENTITY_PLATFORM_API_KEY=identity-platform-api-key:latest"
```

Notes:
- `--no-allow-unauthenticated` is set because the API has its own Bearer-token auth layer. If the mobile app is the only caller and CoM wants Cloud IAM enforcement as an additional perimeter, layer IAM invoker roles on top; otherwise leave the flag in place and rely on the app-level auth.
- `--min-instances=1` reduces cold-start to near zero. Dev runs at min=0. Cost at min=1 on the smallest instance size is on the order of $10 per month.
- Capture the resulting service URL; the mobile-app `.env` in phase 6 needs it.

## 10. Phase 6: Deploy the scheduled Functions

```bash
cd functions
firebase deploy --only functions --project prod
```

After the first deploy, Firebase creates the underlying Cloud Scheduler job automatically. Confirm:

```bash
gcloud scheduler jobs list --project=research-ai-peer-prod --location=us-central1
```

If the scheduled job runs under the default compute SA instead of `aipeer-redcap-sync`, re-attach the correct SA via the Firebase console or by setting `runWith.serviceAccount` in `functions/index.js`.

## 11. Phase 7: Mobile app rebuild under CoM's publisher identity

This is where the student team's role ends. All steps below are performed by a CoM-designated mobile release engineer.

1. Obtain the production Firebase web config for the mobile app from the Firebase console (Project Settings → Your Apps). Populate `front-end/AI-PEER/.env`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=<prod-web-api-key>
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=research-ai-peer-prod.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=research-ai-peer-prod
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=research-ai-peer-prod.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<prod-sender-id>
   EXPO_PUBLIC_FIREBASE_APP_ID=<prod-app-id>
   EXPO_PUBLIC_API_BASE_URL=<prod-cloud-run-url-from-phase-5>
   ```
2. Drop the new `GoogleService-Info.plist` into `front-end/AI-PEER/ios/AIPEER/` and `google-services.json` into `front-end/AI-PEER/android/app/`, replacing the dev-era files.
3. Change the iOS bundle identifier in `front-end/AI-PEER/ios/AIPEER.xcodeproj/project.pbxproj` to the CoM-owned identifier (for example `edu.ucf.med.aipeer`). Change the Android `applicationId` in `front-end/AI-PEER/android/app/build.gradle` to match.
4. Configure signing under the CoM Apple Developer team and Google Play publisher account. Neither of these inherits from the student team; they are new.
5. Rebuild:
   - iOS: `npx expo start`, open `ios/AIPEER.xcworkspace` in Xcode, Product → Archive, upload to App Store Connect.
   - Android: `cd android && ./gradlew bundleRelease`, sign the AAB with CoM's keystore, upload to Google Play.
6. Ship to TestFlight / Internal Testing first. Do not release to patients until the phase 8 smoke test passes.

## 12. Phase 8: Smoke test and cutover

Run from a staff phone against a TestFlight / Internal Testing build before any patient opens the app.

1. Register a test account on the prod API. Confirm the SMS code arrives, verify completes, and Firestore `users/{uid}` shows the new document.
2. Take the FES-I questionnaire end-to-end. Confirm the activity record lands in `users/{uid}/activities/<today>/entries.fesi_*`.
3. Run a Chair Rise test. Confirm the activity record lands with `category: "assessment"` and `exerciseId: "assessment-1"`.
4. Trigger the AI Chat model download. Confirm the signed URL returns HTTP 200 and the GGUF downloads.
5. Wait for 0200 ET or manually trigger `redcapsync`. Confirm the sync completes without error in Cloud Logging.
6. Generate Cloud Logging alert policies for API 5xx rates and Functions failure rates, owned by the CoM IT on-call rotation.

Patient rollout happens only after these six checks pass.

## 13. Phase 9: Ongoing operations (CoM-owned)

- **On-call owner.** CoM IT. The student team is not paged and is not an escalation path.
- **Deploy cadence.** Code lands on `main` after PR review; deploys to prod happen via a GitHub Action that authenticates via Workload Identity Federation to the `aipeer-deployer` SA. No human-held JSON keys.
- **Secret rotation.** Identity Platform API key on a 180-day cadence; REDCap API token follows whatever REDCap's issuance policy dictates.
- **Cost review.** Monthly. Expected steady-state cost is dominated by Cloud Run minimum instances and LLM model egress; neither should exceed $50 per month at clinic-scale usage.
- **Logging access.** All Cloud Logging access is through the `aipeer-prod-owners@ucf.edu` / `aipeer-prod-admins@ucf.edu` groups. No external accounts retain log access.

## 14. Rollback

If a production deploy introduces a regression:

1. `gcloud run services update-traffic aipeer-api --to-revisions=<previous-revision>=100 --project=research-ai-peer-prod` routes 100% of traffic to the previous Cloud Run revision.
2. Firebase Functions roll back by re-deploying the previous `functions/` commit: `git checkout <sha> -- functions/ && firebase deploy --only functions --project prod`.
3. The mobile app cannot be rolled back once shipped. Plan releases conservatively and use TestFlight / Internal Testing tracks for the first 48 hours after any native release.

## 15. Dev project decommissioning

Once the production environment is live and has served successful smoke-test traffic for at least 7 days:

1. Revoke student-team access on `research-ai-peer-dev` if CoM wants the dev project retained for historical reference.
2. If the dev project is no longer needed, delete it with `gcloud projects delete research-ai-peer-dev`. This is a 30-day soft-delete; it can be restored if something surfaces later.
3. Remove any DNS entries pointing at dev.
4. Archive the dev-era iOS and Android builds. They continue to work only until the backing `research-ai-peer-dev` project is deleted; after deletion, they will fail to authenticate.

## 16. Appendix A: complete service account matrix

| SA | When it runs | Needs to read | Needs to write | Acts-as |
|---|---|---|---|---|
| `aipeer-api` | every API request | Firestore (all five collections), both GCS buckets, Identity Platform REST, Secret Manager for `identity-platform-api-key` | Firestore (users, verificationSessions, refreshTokens, activities subcollection), Firebase Auth (create custom tokens, verify ID tokens) | itself (for `signBlob`) |
| `aipeer-redcap-sync` | 0200 ET daily | Firestore `config/redcap`, Firestore `users/*`, Secret Manager for `redcap-api-token` and `redcap-api-url` | Firestore `users/*` (score updates) | n/a |
| `aipeer-deployer` | on CI deploys only | Artifact Registry, Cloud Build | Cloud Run service definitions, Cloud Functions definitions, Artifact Registry images | `aipeer-api`, `aipeer-redcap-sync` |

## 17. Appendix B: open questions for CoM IT

1. Does CoM want Google Cloud Identity (the directory product) to own the `aipeer-prod-owners@ucf.edu` group, or will an existing UCF Google Group be used? Either works; the former gives CoM direct membership control.
2. Are there VPC Service Controls requirements for PHI workloads? If yes, Cloud Run and Cloud Functions need additional Serverless VPC Access connectors and the perimeter definition.
3. Are daily Firestore backups sufficient, or does CoM require point-in-time recovery (Firestore PITR is a separate opt-in and adds cost)?
4. Does CoM want a branded production domain (`api.aipeer.med.ucf.edu`) in front of Cloud Run, or is the default `*.a.run.app` URL acceptable? The branded domain requires Cloud Load Balancer and a managed certificate.
5. Who signs the Twilio / SMS vendor addendum if Identity Platform's default SMS delivery is later swapped for a custom provider? Not needed at launch; Identity Platform's built-in SMS covers it.
