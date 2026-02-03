/**
 * types.ts -vision integration
 *
 */


export type Keypoint = {
    //body part
    name:string;
    x:number;
    y:number;
    confidence:number;
};


export type Pose = {
    confidence:number;
    timestamp:number;
    //0,5,6,7,8,9,12,13,14,15,16,17 - only tracking these
    keypoints:Keypoint[];
    
};

export type FormViolation={
    bodyPart:string;
    message:string;
    severity:'error'|'warning';
};

export type FormFeedback={
    violations:FormViolation[];
    score:number;
    isGoodForm:boolean;
    
};


export type VisionState= {
    isModelDownloaded: boolean;
    isModelLoaded: boolean;
    isTracking: boolean;
    currentPose:null| Pose
    currentFeedback:null| FormFeedback
    downloadProgress: number; // 0-100
    error: string | null;
};


export type VisionConfig = {
    modelURL:string;
    modelFileName:string;
    modelSizeBytes:number;
    minKeypointConfidence:number;
    minPoseConfidence:number;
    targetFPS:number;
    inputSize:number;
};

