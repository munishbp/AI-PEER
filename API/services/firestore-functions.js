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

  // write a single completed activity to the user's activities subcollection.
  // the doc id is the activity's own id (generated client-side) so a retry
  // with the same id is idempotent rather than creating a duplicate.
  async writeUserActivity(userId, activityRecord){
    try {
      const ref = db.collection('users').doc(userId).collection('activities').doc(activityRecord.id);
      await ref.set(activityRecord);
      return ref;
    }
    catch(error){
      console.error("Firestore writeUserActivity Error:", error);
      throw error;
    }
  },

  // read a user's full activity history, newest first
  async getUserActivities(userId){
    try {
      const snap = await db.collection('users').doc(userId).collection('activities').orderBy('completedAt', 'desc').get();
      return snap.docs.map(d => d.data());
    }
    catch(error){
      console.error("Firestore getUserActivities Error:", error);
      throw error;
    }
  }

}

