//template for video route
//basically copy this file for each new exercise
//1. copy and rename it to the exercise video
//2. update videoID to match your GCS file name
//3. Update exercise_name with exercise title
//4. register the route in server.js

const{generateSignedUrl}=require('../services/GCS_Service')

// const getVidURL=async(req,res)=>{
//     //Replace these with the actual videoID we assign it and exercise name
//     const Vid_ID='REPLACE WITH VID FILENAME';
//     const Exercise_Name='REPLACE WITH ACTUAL EXERCISE NAME';

//     try{
//         //generate signed URL from GCS
//         const signedURL=await generateSignedUrl(Vid_ID);
//         res.json({
//             videoId:Vid_ID,
//             videoUrl:signedURL, //the actual URL passed to app user
//             title:Exercise_Name,
//             //seconds
//             duration: 120,
//             //URL valid for 1 hour
//             expiresIn: 3600

//         });
//         //error handling to tell what goes wrong
//     }catch(error){
//         console.error('Error retrieving video:',error);
//         res.status(500).json({
//             error:'Failed to retrieve video',
//             message:error.message
//         })
//     }
// };

const getTugURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Assessment Videos/Test1_Tug.mp4';
    const Exercise_Name='Timed Up and Go';

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

const getCRiseURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Assessment Videos/Test2_Chair_Rise.mp4';
    const Exercise_Name='Chair Rise';

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
const getBalanceURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Assessment Videos/Test3_Balance.mp4';
    const Exercise_Name='4 Stage Balance Test';

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

const getAnkleURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='warm_up/Ankle_Movements.mp4';
    const Exercise_Name='Ankle Warm Up';

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

const getBackURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='warm_up/Back_Extension.mp4';
    const Exercise_Name='Back Extension Warm Up';

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

const getHeadURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='warm_up/Head_Movements.mp4';
    const Exercise_Name='Head Warm Up';

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

const getNeckURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='warm_up/Neck_Movements.mp4';
    const Exercise_Name='Neck Warm Up';

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

const getTrunkURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='warm_up/Trunk_Movements.mp4';
    const Exercise_Name='Trunk Warm Up';

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

const getBWWalkURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Backwards_Walk.mp4';
    const Exercise_Name='Backward Walk';

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

const getHTStandURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='balance/Heel_Toe_Stand.mp4';
    const Exercise_Name='Heel Toe Stand';

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

const getHTWalkURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Heel_Toe_Walk.mp4';
    const Exercise_Name='Heel Toe Walk';

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

const getHTWalkBkwdURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Heel_Toe_Walk_Bkwd.mp4';
    const Exercise_Name='Heel Toe Walk Backward';

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

const getHWalkURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Heel_Walk.mp4';
    const Exercise_Name='Heel Walk';

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

const getKneeBendsURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Knee_Bends.mp4';
    const Exercise_Name='Knee Bends';

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

const getOLStandURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/One_Leg_Stand.mp4';
    const Exercise_Name='One Leg Stand';

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

const getSWWalkURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Sideways_Walk.mp4';
    const Exercise_Name='Sideways Walk';

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

const getSitStandURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Sit_Stand.mp4';
    const Exercise_Name='Sit Stand';

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

const getToeWalkURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Toe_Walk.mp4';
    const Exercise_Name='Toe Walk';

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

const getWalkTurnURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Balance/Walk_Turn.mp4';
    const Exercise_Name='Walk Turn';

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

const getBackKneeURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Strength/Back_Knee_Streng.mp4';
    const Exercise_Name='Back Knee Strengthening';

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

const getCalfRaisesURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Strength/Calf_Raises.mp4';
    const Exercise_Name='Calf Raises';

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

const getFrntKneeURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Strength/Frnt_Knee_Streng.mp4';
    const Exercise_Name='Front Knee Strengthening';

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

const getSideHipURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Strength/Side_Hip_Streng.mp4';
    const Exercise_Name='Side Hip Strengthening';

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

const getToeRaisesURL=async(req,res)=>{
    //Replace these with the actual videoID we assign it and exercise name
    const Vid_ID='Strength/Toe_Raises.mp4';
    const Exercise_Name='Toe Raises';

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
module.exports={
    getTugURL,
    getCRiseURL,
    getBalanceURL,
    getAnkleURL,
    getBackURL,
    getHeadURL,
    getNeckURL,
    getTrunkURL,
    getBWWalkURL,
    getHTStandURL,
    getHTWalkURL,
    getHTWalkBkwdURL,
    getHWalkURL,
    getKneeBendsURL,
    getOLStandURL,
    getSWWalkURL,
    getSitStandURL,
    getToeWalkURL,
    getWalkTurnURL,
    getBackKneeURL,
    getCalfRaisesURL,
    getFrntKneeURL,
    getSideHipURL,
    getToeRaisesURL,

 } ;
