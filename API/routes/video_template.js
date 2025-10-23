//template for video route
//basically copy this file for each new exercise
//1. copy and rename it to the exercise video
//2. update videoID to match your GCS file name
//3. Update exercise_name with exercise title
//4. register the route in server.js

const{generateSignedUrl}=require('../services/GCS_Service')

const getVidURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='REPLACE WITH VID FILENAME';
    const Exercise_Name='REPLACE WITH ACTUAL EXERCISE NAME';

    try{
        //generate signed URL from GCS
        const signedURL=await generateSignedUrl(Vid_ID);
        res.json({
            videoId:Vid_ID,
            videoUrl:signedURL, //the actual URL passed to app user
            title:Exercise_Name,
            //seconds
            duration: 120,
            //URL valid for 1 hour
            expiresIn: 3600

        });
        //error handling to tell what goes wrong
    }catch(error){
        console.error('Error retrieving video:',error);
        res.status(500).json({
            error:'Failed to retrieve video',
            message:error.message
        })
    }
};
//export function so server.js can use it
module.exports=getVidURL;