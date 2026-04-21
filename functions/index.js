const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { importToREDCap, exportFromREDCap } = require("./services/REDCap_Service");
const { getUsersForSync } = require("./services/firestore-readers");
const { REDCAP_TO_FIRESTORE } = require("./config/fieldMappings");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore("ai-peer");

// REDCap credentials live in Secret Manager. set them once with:
//   firebase functions:secrets:set REDCAP_API_URL
//   firebase functions:secrets:set REDCAP_API_TOKEN
// binding them here both scopes the secrets to this one function and
// grants the runtime service account secretmanager.secretAccessor at deploy.
const REDCAP_API_URL   = defineSecret("REDCAP_API_URL");
const REDCAP_API_TOKEN = defineSecret("REDCAP_API_TOKEN");

exports.redcapSync = onSchedule(
    {
        schedule: "0 2 * * *",       // 2am daily
        timeZone: "America/New_York",
        timeoutSeconds: 300,         // 5 min timeout for ~50 users
        retryCount: 3,                // retry up to 3 times on failure
        serviceAccount: "munish@research-ai-peer-dev.iam.gserviceaccount.com",
        secrets: [REDCAP_API_URL, REDCAP_API_TOKEN]
    },
    async (event) => {
        console.log("[SYNC] Starting REDCap sync...");
        try {
            // -------------------------------------------------------
            // STEP 1: Pull scores from REDCap into Firestore
            // -------------------------------------------------------
            console.log("[SYNC] Fetching records from REDCap...");
            const redcapRecords = await exportFromREDCap();

            // Write btrack_score and fear_falling_score back to Firestore
            // for any user whose scores originated in REDCap
            const batch = db.batch();
            let redcapUpdateCount = 0;

            for (const record of redcapRecords) {
                // REDCap participant doesn't exist in Firestore yet — create them
                if (!record.phonenum) {
                    console.log(`[SYNC] Skipping REDCap record ${record.userID} — no phone number`);
                    continue;
                }
                // Match REDCap record to Firestore user by phone number
                const snapshot = await db.collection("users")
                    .where("phoneNumber", "==", record.phonenum)
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    const newUserRef = db.collection("users").doc();
                    batch.set(newUserRef, {
                        phoneNumber: record.phonenum,
                        btrack_score: record.btrack_score ?? null,
                        fear_falling_score: record.fear_falling_score ?? null,
                        phoneVerified: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: "redcap"                    // marks this user as REDCap-originated
                    });
                    redcapUpdateCount++;
                    console.log(`[SYNC] Created new Firestore user from REDCap record ${record.userID}`);
                    continue;
                }

                const userRef = snapshot.docs[0].ref;
                const userData = snapshot.docs[0].data();
                batch.update(userRef, {
                    [REDCAP_TO_FIRESTORE.b_track_score]: record.btrack_score ?? userData.btrack_score,
                    [REDCAP_TO_FIRESTORE.ff_score]: userData.fear_falling_score === null ? record.fear_falling_score:userData.fear_falling_score,
                    updatedAt: new Date().toISOString()
                });
                redcapUpdateCount++;
            }

            await batch.commit();
            console.log(`[SYNC] Updated ${redcapUpdateCount} Firestore users from REDCap.`);

            // -------------------------------------------------------
            // STEP 2: Push Firestore scores to REDCap
            // -------------------------------------------------------
            console.log("[SYNC] Fetching users from Firestore...");
            const users = await getUsersForSync();

            // Filter out users whose scores are still null
            const readyToSync = users.filter(u =>
                u.btrack_score !== null &&
                u.fear_falling_score !== null
            );

            if (readyToSync.length === 0) {
                console.log("[SYNC] No users ready to sync to REDCap.");
                return;
            }

            const importedCount = await importToREDCap(readyToSync);
            console.log(`[SYNC] Pushed ${importedCount} records to REDCap.`);

        } catch (error) {
            // Log error without exposing any PHI
            console.error("[SYNC] Sync failed:", error.message);
            throw error; // rethrow so Cloud Functions marks the run as failed
        }
    }
);