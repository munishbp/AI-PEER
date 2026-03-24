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
        updatedAt: data.updatedAt || null
      };
    })
    .filter(Boolean); // remove invalid/null records
}

module.exports = {
  getUsersForSync
};