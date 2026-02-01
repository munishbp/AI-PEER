// config/firebaseConfig.js
// Single source of truth for Firebase Admin initialization

const admin = require("firebase-admin");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    if (process.env.GCS_PRIVATE_KEY) {
        // Local development - use env vars
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.GCS_PROJECT_ID,
                clientEmail: process.env.GCS_CLIENT_EMAIL,
                privateKey: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n')
            })
        });
    } else {
        // Cloud Run - uses Application Default Credentials
        admin.initializeApp();
    }
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('ai-peer');

module.exports = { admin, db };
