//controller for LLM model download
//generates a signed URL for the finetuned model in GCS

const{generateSignedUrl}=require('../services/GCS_Service')

const MODEL_BUCKET = process.env.GCS_MODEL_BUCKET || 'qwenfinetune';

const getModelURL=async(req,res)=>{
    const Model_ID='models/Qwen3.5-2B-aipeer-Q4_K_M.gguf';

    try{
        //generate signed URL from model bucket (1 hour expiry)
        const signedURL=await generateSignedUrl(Model_ID, MODEL_BUCKET);
        res.json({
            modelUrl:signedURL,
            filename:'Qwen3.5-2B-aipeer-Q4_K_M.gguf',
            expiresIn: 3600
        });
    }catch(error){
        console.error('Error retrieving model URL:',error);
        res.status(500).json({
            error:'Failed to retrieve model URL',
            message:error.message
        })
    }
};

module.exports={getModelURL};
