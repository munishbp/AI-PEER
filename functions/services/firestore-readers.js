const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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
      const phonenum = data.phone_number;
      const balanceTrackScore = data.balance_track_score;
      const fallFearScore = data.fall_fear_score;

      // Validate minimal requirements
      if (
        typeof phonenum !== "string" ||
        !Number.isInteger(balanceTrackScore) ||
        !Number.isInteger(fallFearScore)
      ) {
        return null; // skip invalid records safely
      }

      return {
        userID,
        phonenum,
        balanceTrackScore,
        fallFearScore,
        updatedAt: data.updatedAt || null
      };
    })
    .filter(Boolean); // remove invalid/null records
}

module.exports = {
  getUsersForSync
};