//
//  config.ts
//  
//
//
//

import {VisionConfig} from './types';


export const VISION_CONFIG:VisionConfig={
    modelURL://python code- model_path = hf_hub_download(repo_id="openvision/yolo26-n-pose", filename="model.pt"),
    modelFileName: 'yolo26n-pose.tflite',
    modelSizeBytes:0,
    
    minKeyPointConfidence: 0.5,
    minPoseConfidence: 0.3,
    
    targetFPS: 30,
    inputSize:640,
};


export const MODEL_URL=VISION_CONFIG.modelURL;
export const MODEL_FILENAME=VISION_CONFIG.modelFileName; 
