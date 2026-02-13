//
//  VisionService.ts
//
//
//
//
import{loadTensorflowModel, TensorflowModel} from 'react-native-fast-tflite';
import{MODEL_ASSET} from  './config';
import {Pose, Keypoint} from './types';
import {keypoint_names} from './constants';

const NUM_DETECTIONS=8400;
const VALUES_PER_DETECTION=56;
const MIN_DATA_LENGTH=NUM_DETECTIONS*VALUES_PER_DETECTION;

// standalone pose parser — can be called from worklet or js context
export function parsePoseFromOutput(data:Float32Array):Pose|null{
    if(!data||data.length<MIN_DATA_LENGTH){
        if(__DEV__) console.warn('invalid model output, expected',MIN_DATA_LENGTH,'got',data?.length);
        return null;
    }

    let bestConfidence=0;
    let bestIndex=-1;

    for(let i=0;i<NUM_DETECTIONS;i++){
        // confidence at index 4
        const confidence=data[4*NUM_DETECTIONS+i];
        if(confidence>bestConfidence){
            bestConfidence=confidence;
            bestIndex=i;
        }
    }

    // no good detection
    if(bestIndex===-1||bestConfidence<0.3){
        return null;
    }

    // extract keypoints for best detection
    const keypoints:Keypoint[]=[];
    for(let k=0;k<17;k++){
        // keypoints start at index 5, each has x,y,confidence
        const baseIndex=(5+k*3)*NUM_DETECTIONS+bestIndex;

        keypoints.push({
            name:keypoint_names[k],
            x:data[baseIndex],
            y:data[baseIndex+NUM_DETECTIONS],
            confidence:data[baseIndex+2*NUM_DETECTIONS],
        });
    }
    const average_confidence=keypoints.reduce((sum,kp)=>sum+kp.confidence,0)/17;

    return{
        keypoints,
        timestamp:Date.now(),
        confidence:average_confidence,
    };
}

class VisionService{
    private static instance:VisionService;
    private isInitialized=false;
    private interpreter:TensorflowModel|null=null;
    private initPromise:Promise<void>|null=null;


    private constructor(){}

    isReady():boolean{
        return this.isInitialized;
    }

    static getInstance():VisionService{
        if(!VisionService.instance){
            VisionService.instance=new VisionService();
        }
        return VisionService.instance;
    }

    // returns the raw tflite interpreter for frame processor use
    getInterpreter():TensorflowModel|null{
        return this.interpreter;
    }

    async initialize():Promise<void>{
        if(this.isInitialized) return;
        if(!this.initPromise){
            this.initPromise=this._doInitialize();
        }
        return this.initPromise;
    }

    private async _doInitialize():Promise<void>{
        try{
            if(__DEV__) console.log('initializing vision model',MODEL_ASSET);
            const startNow:number=Date.now();
            this.interpreter=await loadTensorflowModel(MODEL_ASSET);
            const elapsed:number=Date.now()-startNow;

            if(__DEV__) console.log(`vision model initialized in ${elapsed}ms`);
            this.isInitialized=true;
        }
        catch(error){
            this.initPromise=null;
            console.error('failed to initialize vision model',error);
            throw error;
        }
    }

    isLoading():boolean{
        return this.initPromise!==null&&!this.isInitialized;
    }

    runInference(frameData:Float32Array, width:number, height:number):Pose|null{
        if(!this.interpreter){
            if(__DEV__) console.warn('model not initialized');
            return null;
        }

        try{
            const outputs=this.interpreter.runSync([frameData]);

            // runSync returns TypedArray[] directly
            const output=outputs[0];
            if(!output){
                if(__DEV__) console.warn('no output tensor from model');
                return null;
            }

            // ensure we have a Float32Array for the pose parser
            const data=output instanceof Float32Array
                ?output
                :new Float32Array(output as ArrayLike<number>);

            return parsePoseFromOutput(data);
        }catch(error){
            // bad frame shouldn't crash the app
            if(__DEV__) console.warn('inference error',error);
            return null;
        }
    }

    release():void{
        if(this.interpreter){
            this.interpreter=null;
            this.isInitialized=false;
            this.initPromise=null;
            if(__DEV__) console.log('vision model released');
        }
    }
}

export default VisionService.getInstance();
