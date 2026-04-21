# Firebase Cloud Functions -- REDCap Sync

Scheduled Cloud Function that synchronizes patient assessment data between
REDCap (UCF College of Medicine's clinical data platform) and Firestore.

---

## What it does

`redcapSync` runs every day at 2:00 AM Eastern (cron `0 2 * * *`,
`America/New_York`). It executes two sequential steps. Step 1 (pull) calls the
REDCap export API, fetches every record's `b_track_score`, `ff_score`, and
`phone_number`, then matches each record to a Firestore user by phone number.
It writes `btrack_score` and `fear_falling_score` into Firestore **only when
those fields are currently null** -- this guard prevents a stale REDCap value
from overwriting a score the participant submitted through the app. Step 2
(push) reads every Firestore user whose `btrack_score` and `fear_falling_score`
are both non-null and pushes them back to REDCap using the REDCap import API
with `overwriteBehavior: overwrite`. The field names used in both directions are
defined in `config/fieldMappings.js`.

---

## File structure

| File | Purpose |
|---|---|
| `index.js` | Function entry point. Declares `redcapSync` with schedule, timeout, retry, and service-account settings. Orchestrates both sync steps. |
| `services/REDCap_Service.js` | REDCap API wrapper. `exportFromREDCap()` fetches records; `importToREDCap()` pushes records. Loads API credentials lazily from Firestore and caches them in memory for the lifetime of the invocation. |
| `services/firestore-readers.js` | `getUsersForSync()` queries the entire `users` collection and returns records that pass basic type validation (phone is a string, both scores are integers). |
| `config/fieldMappings.js` | Single source of truth for Firestore-to-REDCap field name mapping. The reverse mapping (`REDCAP_TO_FIRESTORE`) is generated automatically, so updating one direction is sufficient. |
| `package.json` | Node 20 runtime. Key deps: `firebase-admin ^12`, `firebase-functions ^4.9`, `node-fetch ^2.7`. |

---

## Config & secrets

REDCap credentials live in **Google Cloud Secret Manager**, declared to the
function via `defineSecret()` in `index.js`. The Functions runtime injects the
values into `process.env` only while a scheduled run is executing.

| Secret name | Env var (at invocation) | Description |
|---|---|---|
| `REDCAP_API_URL` | `process.env.REDCAP_API_URL` | REDCap API endpoint URL (must be HTTPS) |
| `REDCAP_API_TOKEN` | `process.env.REDCAP_API_TOKEN` | REDCap API token for the service user |

**To set or rotate a secret:**

```bash
firebase functions:secrets:set REDCAP_API_URL
firebase functions:secrets:set REDCAP_API_TOKEN
```

Each command prompts for the value. Rotation takes effect on the next deploy —
`defineSecret()` pins the function to a specific secret version at deploy
time, so redeploy after setting a new value:

```bash
firebase deploy --only functions:redcapSync
```

**Never commit credentials to Git or put them in `.env`**. `firebase deploy`
grants the function's runtime service account `roles/secretmanager.secretAccessor`
on each declared secret automatically.

---

## Retry & failure semantics

- **Cloud Functions retries**: the function is configured with `retryCount: 3`.
  If the function throws (any uncaught error), Cloud Functions will retry the
  entire run up to three times. The function re-throws on any error, so all
  failures are eligible for retry.

- **No application-level retry or backoff**: there is no exponential backoff,
  no per-record retry loop, and no dead-letter queue inside the code. If the
  REDCap API is unreachable, `fetch` will throw, the function will fail, and
  Cloud Functions will retry the whole job.

- **Partial Firestore writes**: Step 1 uses a single `batch.commit()` call.
  Firestore batches are atomic -- either all writes in the batch succeed or
  none do. If the commit fails, the batch is not partially applied.

- **Idempotency**: Step 1 (pull) is idempotent -- it only writes when the
  Firestore value is null, so re-running after a partial failure is safe for
  that step. Step 2 (push) uses `overwriteBehavior: overwrite`, meaning
  repeated runs will overwrite REDCap with the same values, which is safe but
  not a no-op on the REDCap side. **Known limitation**: if the function fails
  between committing the Firestore batch (end of Step 1) and completing the
  REDCap import (end of Step 2), a retry will re-push Step 2 records but will
  skip re-applying Step 1 writes (already non-null). This is generally safe
  but worth noting.

---

## Typical volume

The function comment and `timeoutSeconds: 300` note "~50 users." Step 1 issues
one Firestore `where` query **per REDCap record** inside a sequential loop
(no batching), so at 50 records that is 50 serial reads before the batch
commit. Step 2 calls `getUsersForSync()`, which does a full collection scan of
`users` with no pagination or limit. There is no slice or page size in the
code -- the entire collection is fetched in one request. If the user count
grows significantly beyond 50, both the Step 1 per-record query loop and the
Step 2 full collection scan will become the bottleneck before the 5-minute
timeout is hit.

---

## Running locally

1. Install dependencies:

```bash
cd functions && npm install
```

2. Start the Functions emulator:

```bash
firebase emulators:start --only functions
```

3. The emulator does not trigger scheduled functions automatically. Invoke the
   function manually via the emulator shell or by sending a POST to the
   emulator's HTTP trigger endpoint. From the Firebase emulator UI
   (`http://127.0.0.1:4000`), navigate to Functions and use the "Call" option.

4. The function reads REDCap credentials from `process.env.REDCAP_API_URL` and
   `process.env.REDCAP_API_TOKEN`, which are injected from Secret Manager at
   invocation in production. For local emulator runs, export them yourself:

```bash
export REDCAP_API_URL=https://your-redcap-instance/api/
export REDCAP_API_TOKEN=YOUR_TEST_TOKEN
firebase emulators:start --only functions
```

5. Set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and
   `FIREBASE_CONFIG` as needed if the Admin SDK does not auto-detect the
   emulator. The standard Firebase emulator environment variables are picked
   up automatically when running through `firebase emulators:start`.

---

## Deployment

Deploy only this function:

```bash
firebase deploy --only functions:redcapSync
```

Deploy all functions (if others are added later):

```bash
firebase deploy --only functions
```

**View recent logs:**

```bash
firebase functions:log --only redcapSync
```

Or in Cloud Logging (GCP console), filter by:

```
resource.type="cloud_run_revision"
labels."deployment-name"="redcapsync"
```

The deployed function handle is `redcapSync` (camelCase in code, normalized to
`redcapsync` in Cloud Run/Logging).

---

## Known issues / gotchas

- **Per-record Firestore queries in a loop**: Step 1 queries Firestore once per
  REDCap record sequentially. This is O(n) in round trips and will be slow at
  larger scale. Consider batching by phone number if the user count grows.

- **Full collection scan in Step 2**: `getUsersForSync()` fetches every
  document in `users` with no limit or cursor. This will time out or incur
  significant cost if the collection grows large.

- **Secret rotation latency**: `defineSecret()` pins the function to a
  specific secret version at deploy time. `firebase functions:secrets:set`
  creates a new version but does NOT retarget running deployments — redeploy
  (`firebase deploy --only functions:redcapSync`) to pick up the new value.

- **No push notification on failure**: if all three retries are exhausted,
  there is no alerting beyond Cloud Logging. Consider adding a Cloud Monitoring
  alerting policy on function error rate for this job.

- **`updatedAt` written as a plain ISO string**: `updatedAt` is set to
  `new Date().toISOString()` rather than a Firestore `Timestamp`. Queries that
  sort or filter by `updatedAt` need to account for this.
