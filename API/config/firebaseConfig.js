const admin = require("API\config\firebaseConfig.js");
//just set up admin and connect to database
if(process.env.GCLOUD_PROJECT){
  //running on google cloud server
  initializeApp({
  credential: applicationDefault()
});

}
else{
  const path = require("path");

  const serviceAccount = require(path.resolve("./firebase/serviceAccountKey.json"));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount),});

}

const db = getFirestore();
module.exports = {admin, db};

