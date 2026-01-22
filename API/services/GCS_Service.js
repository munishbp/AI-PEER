//this file handles all GCS operations for video retrieval
//generates HIPAAA compliant signed URLs with expiration

//imports the installed google library
//import signblob
const{Storage}=require('@google-cloud/storage')
const {IAMCredentialsClient}=require('@google-cloud/iam-credentials').v1; 

//initialize GCS client
//uses explicit credentials locally (from .env), or default credentials on Cloud Run
const storageConfig = {
    projectId: process.env.GCS_PROJECT_ID
};

//only add explicit credentials if running locally with env vars
if (process.env.GCS_PRIVATE_KEY) {
    storageConfig.credentials = {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
}

const storage = new Storage(storageConfig);

//get the bucket where videos are stored-where videos are actually stored
const bucketName=process.env.GCS_BUCKET_NAME;

//service account email - needed for both local and Cloud Run
const clientEmail = process.env.GCS_CLIENT_EMAIL;

//check if we're running on Cloud Run (no private key available)
const isCloudRun = !process.env.GCS_PRIVATE_KEY;

//initialize IAM client for Cloud Run signing (only when needed)
let iamClient;
if (isCloudRun) {
    iamClient = new IAMCredentialsClient();
}

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

        //on Cloud Run: use IAM signBlob instead of local private key
        if (isCloudRun) {
            options.credentials = {
                client_email: clientEmail,
                //custom sign function - calls IAM API to sign remotely
                sign: async (stringToSign) => {
                    const [response] = await iamClient.signBlob({
                        name: `projects/-/serviceAccounts/${clientEmail}`,
                        payload: Buffer.from(stringToSign),
                    });
                    return response.signedBlob.toString('base64');
                }
            };
        }

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