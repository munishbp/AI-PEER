const {verification} = require("../services/Auth_Service");

const getVerification=async(req,res,next)=>{
    try{
        const token= req.headers.authorization?.replace("Bearer ","");
        await verification(token)
        next()
    }
    catch(error){
        console.error('Error verifying user',error);
        res.status(401).json({
            error:'Verification failed',
            message:error.message
        })
    }

}

module.exports=getVerification;