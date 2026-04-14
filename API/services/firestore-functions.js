const {db} = require("../config/firebaseConfig");

module.exports = {
    //firebase functions to call in routes
  async testConnection() {
    const testDoc = db.collection("test").doc("ping");
    await testDoc.set({ time: new Date().toISOString() });
    console.log("? Firestore write successful");
  },

  // testConnection().catch(console.error);

  //if changing more than one data field just overwrite with register

  //new user account add duplicate check later
  async registerUser(data){
    //check for dup by calling seperate function checking if

    try {
      const res = await db.collection('users').add(data);

      return res;
    }
    catch(error){
      console.error("Firestore registerUser Error:", error);
      throw error;
    }
  },

  //update user info
  async updateUser(id,data){

    try {
      const res = await db.collection('users').doc(id).update(data);

      return res;
    }
    catch(error){
      console.error("Firestore updateUser Error:", error);
      throw error;
    }

  },

  async deleteUser(id){

    try {
    const res = await db.collection('users').doc(id).delete();

    return res;
    }
    catch(error){
    console.error("Firestore DeleteUser Error:", error);
    throw error;
    }
  },

  async readId(id){
    try {
    const res = await db.collection('users').doc(id).get();



    if(!res.exists){
      return null;
      }

    return res;
    }
    catch(error){
    console.error("Firestore ReadUser Error:", error);
    throw error;
    }
  },

  // write a completed activity into a daily-aggregated document.
  // path: users/{uid}/activities/{YYYY-MM-DD}
  // each record is stored under entries.<activityId>, so a retry with
  // the same id overwrites the same key — idempotent, no duplicates.
  // collapses ~1800 docs/year down to ~365.
  async writeUserActivity(userId, activityRecord){
    try {
      const dayKey = activityRecord.completedAt.slice(0, 10); // "YYYY-MM-DD"
      const ref = db.collection('users').doc(userId).collection('activities').doc(dayKey);
      await ref.set(
        { [`entries.${activityRecord.id}`]: activityRecord },
        { merge: true }
      );
      return ref;
    }
    catch(error){
      console.error("Firestore writeUserActivity Error:", error);
      throw error;
    }
  },

  // read a user's full activity history, newest first.
  // handles both new daily-aggregated docs (entries map) and legacy
  // one-doc-per-activity records so no migration is required.
  async getUserActivities(userId){
    try {
      const snap = await db.collection('users').doc(userId).collection('activities').get();
      const all = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.entries && typeof data.entries === 'object') {
          all.push(...Object.values(data.entries));
        } else if (data.id && data.completedAt) {
          // legacy one-doc-per-activity format
          all.push(data);
        }
      }
      all.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      return all;
    }
    catch(error){
      console.error("Firestore getUserActivities Error:", error);
      throw error;
    }
  }

}

