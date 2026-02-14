//
//  FormAnalyzer.ts
//
//
//
//
import {getExerciseRules} from "@/src/vision/exercises"
import {Pose, Keypoint, FormFeedback, FormViolation} from "./types"
import {AngleCheck, AlignmentCheck, PositionCheck, FormCheck} from "@/src/vision/exercises/types"
import {calculateAngle, angleFromVertical, angleFromHorizontal, isAbove, isBelow} from "@/src/vision/exercises/utils"


export function analyzePose(pose:Pose, exerciseId:string):FormFeedback{
    const violations:FormViolation[]=[];

    const rules=getExerciseRules(exerciseId);

    if(rules){
        for(const check of rules.checks){
            if (check.type==='angle'){
                const result=checkAngle(pose,check);
                if (result){
                    violations.push(result);
                }
            }
            if(check.type==='alignment'){
                const result=checkAlignment(pose,check);
                if (result){
                    violations.push(result);
                }
            }
            if(check.type==='position'){
                const result=checkPosition(pose,check);
                if (result){
                    violations.push(result);
                }
            }
        }
    }

    const score=calculateScore(violations);
    return {
        violations,
        score,
        isGoodForm: score >=70
    }

}

function getKeypoint(pose:Pose,name:string):Keypoint|undefined{
    if (!pose.keypoints.find(x=>x.name === name)){
        return undefined;
    }
    return pose.keypoints.find(x=>x.name === name);
}

function checkAngle(pose:Pose, check:AngleCheck):FormViolation|null{
    const keypoint_1=getKeypoint(pose,check.keypoints[0]);
    const keypoint_2=getKeypoint(pose,check.keypoints[1]);
    const keypoint_3=getKeypoint(pose,check.keypoints[2]);

    if(!keypoint_1||!keypoint_2||!keypoint_3){
        return null;
    }

    const angle:number=calculateAngle(keypoint_1,keypoint_2,keypoint_3);

    if (angle>=check.min && angle<=check.max){
        return null;
    }
    return{
        bodyPart:check.keypoints[1],
        message:check.message,
        severity:check.severity,
    };
}

function checkAlignment(pose:Pose,check:AlignmentCheck):FormViolation|null{
    const keypoint_1=getKeypoint(pose,check.keypoints[0]);
    const keypoint_2=getKeypoint(pose,check.keypoints[1]);

    if(!keypoint_1||!keypoint_2){
        return null;
    }

    if (check.direction==='vertical'){
        const vert_angle:number=angleFromVertical(keypoint_1,keypoint_2);
        if (vert_angle>=check.tolerance){
            return{
                bodyPart:check.keypoints[1],
                message:check.message,
                severity:check.severity,
            };
        }
    }

    if (check.direction==='horizontal'){
        const hor_angle:number=angleFromHorizontal(keypoint_1,keypoint_2);
        if (hor_angle>=check.tolerance){
            return{
                bodyPart:check.keypoints[1],
                message:check.message,
                severity:check.severity,
            };
        }
    }
    return null;
}

function checkPosition(pose:Pose,check:PositionCheck):FormViolation|null{
    const keypoint = getKeypoint(pose, check.keypoint);
    const reference = getKeypoint(pose, check.reference);

    if (!keypoint || !reference) {
        return null;
    }

    let isCorrect = false;

    if (check.relation === 'above') {
        isCorrect = isAbove(keypoint, reference);
    } else if (check.relation === 'below') {
        isCorrect = isBelow(keypoint, reference);
    } else if (check.relation === 'left_of') {
        isCorrect = keypoint.x < reference.x;
    } else if (check.relation === 'right_of') {
        isCorrect = keypoint.x > reference.x;
    }

    if (!isCorrect) {
        return {
            bodyPart: check.keypoint,
            message: check.message,
            severity: check.severity,
        };
    }

    return null;
}



function calculateScore(violations:FormViolation[]):number{
    if(violations.length===0){
        return 100;
    }

    let score:number=100;

    for(const violation of violations){
        if (violation.severity==='error'){
            score-=20;
        }

        if (violation.severity==='warning'){
            score-=10;
        }
    }


    return Math.max(0, score);
}



