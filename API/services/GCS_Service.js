//this file handles all GCS operations for video retrieval
//generates HIPAAA compliant signed URLs with expiration

//imports the installed google library
const{Storage}=require('@google-cloud/storage')

//initialize GCS client with credentials from .env

const storage=new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g,'\n')
    }
});

//get the bucket where videos are stored-where videos are actually stored
const bucketName=process.env.GCS_BUCKET_NAME;


//function to generate the signed URL for a video
//takes the filename as input
//use async because it needs to communicate with GCS
async function generateSignedUrl(videoFileName){
    try{
        //reference to specific video file in bucket
        //access bucket for specific video
        const file=storage.bucket(bucketName).file(videoFileName);

        //config for the signed URL
        const options={
            version:'v4',
            action:'read',
            //1 hour from now
            expires: Date.now()+60*60*1000//sec, minute, millisec
        };
        //generate and return the signed URL
        const[signedURL]=await file.getSignedUrl(options);
        return signedURL;
    }
    catch(error){
        console.error('Error generating signed URL:',error);
        throw new Error('Cannot generate the video URL');
    }
}
//video_template .js will use this so need to export it
module.exports={generateSignedUrl};