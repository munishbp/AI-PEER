const {verification} = require("../services/Auth_Service");

const getVerification=async(req,res,next)=>{
    try{
        const token= req.headers.authorization?.replace("Bearer ","");
        // attach the decoded token to req.user so downstream controllers can
        // read req.user.uid without re-verifying or trusting body params
        const decoded = await verification(token)
        req.user = decoded;
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