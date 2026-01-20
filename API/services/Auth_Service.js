//imports firebase admin sdk as object
const admin=require('firebase-admin')

//initialize Firebase Admin
//uses explicit credentials locally (from .env), or default credentials on Cloud Run
if (process.env.GCS_PRIVATE_KEY) {
    //local development - use env vars
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.GCS_PROJECT_ID,
            clientEmail: process.env.GCS_CLIENT_EMAIL,
            privateKey: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
} else {
    //Cloud Run - uses GOOGLE_APPLICATION_CREDENTIALS automatically
    admin.initializeApp();
}


async function verification(token){
    try{
        return await admin.auth().verifyIdToken(token);
    }
    catch(error){
        console.error('Error verifying user',error);
        throw new Error('User may not be approved to use AI PEER');

    }


}



module.exports={verification};