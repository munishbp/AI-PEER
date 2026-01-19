//imports firebase admin sdk as object
const admin=require('firebase-admin')


admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.GCS_PROJECT_ID,
        clientEmail: process.env.GCS_CLIENT_EMAIL,
        privateKey: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
});


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