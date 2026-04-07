# Firebase Cloud Functions -- REDCap Sync

Scheduled Cloud Function that synchronizes user assessment data between Firestore and REDCap, a clinical data management platform used by UCF College of Medicine.

## Schedule

- **Frequency**: Daily at 2:00 AM Eastern (America/New_York)
- **Timeout**: 5 minutes (handles ~50 users)
- **Retries**: Up to 3 times on failure
- **Service account**: munish@research-ai-peer-dev.iam.gserviceaccount.com

## Sync Logic

The sync runs in two steps:

**Step 1 -- Pull from REDCap to Firestore:**
- Fetches all records from REDCap via the REDCap API.
- Matches records to Firestore users by phone number.
- Updates `btrack_score` and `fear_falling_score` in Firestore ONLY if the existing Firestore value is null.
- This prevents overwriting scores that a user submitted through the app with stale REDCap data.

**Step 2 -- Push from Firestore to REDCap:**
- Reads all Firestore users where both `btrack_score` and `fear_falling_score` are non-null.
- Pushes these records to REDCap using the REDCap import API.

## Field Mapping

Defined in `config/fieldMappings.js`. The reverse mapping is generated automatically.

| Firestore Field | REDCap Field |
|-----------------|--------------|
| btrack_score | b_track_score |
| fear_falling_score | ff_score |
| phoneNumber | phone_number |
| compliance_days_active | compliance_active_days |
| compliance_rate | compliance_rate |

## Configuration

REDCap API credentials are stored in Firestore at the `config/redcap` document (not in environment variables). The Cloud Function reads them at runtime.

| Field | Description |
|-------|-------------|
| apiToken | REDCap API authentication token |
| apiUrl | REDCap API endpoint URL |

## Deployment

```bash
firebase deploy --only functions:redcapSync
```

## Files

| File | Purpose |
|------|---------|
| index.js | Function entry point. Defines the `redcapSync` scheduled function with both sync steps. |
| services/REDCap_Service.js | REDCap API wrapper. `exportFromREDCap()` fetches records, `importToREDCap()` pushes records. |
| services/firestore-readers.js | `getUsersForSync()` queries users with non-null scores for the push step. |
| config/fieldMappings.js | Bidirectional field name mapping between Firestore and REDCap. |
