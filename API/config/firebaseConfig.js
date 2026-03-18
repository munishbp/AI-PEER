// config/firebaseConfig.js
// Single source of truth for Firebase Admin initialization

const admin = require("firebase-admin");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    try {
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
    } catch (error) {
        if (process.env.NODE_ENV === 'test') {
            console.warn('[CI] Firebase init skipped:', error.message);
        } else {
            throw error;
        }
    }
}

const { getFirestore } = require('firebase-admin/firestore');

let db = null;
if (admin.apps.length) {
    db = getFirestore('ai-peer');
}

module.exports = { admin, db };
