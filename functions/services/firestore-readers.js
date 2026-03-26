const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore("ai-peer");

async function getUsersForSync() {
  const snapshot = await db.collection("users").get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map(doc => {
      const data = doc.data();

      // Required fields
      const userID = doc.id;
      const phonenum = data.phoneNumber;
      const btrack_score = data.btrack_score;
      const fear_falling_score = data.fear_falling_score;

      // Validate minimal requirements
      if (
        typeof phonenum !== "string" ||
        !Number.isInteger(btrack_score) ||
        !Number.isInteger(fear_falling_score)
      ) {
        return null; // skip invalid records safely
      }

      return {
        userID,
        phonenum,
        btrack_score,
        fear_falling_score,
        compliance_days_active: Number.isInteger(data.compliance_days_active) ? data.compliance_days_active : null,
        compliance_rate: Number.isInteger(data.compliance_rate) ? data.compliance_rate : null,
        updatedAt: data.updatedAt || null
      };
    })
    .filter(Boolean); // remove invalid/null records
}

module.exports = {
  getUsersForSync
};