import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  submitActivityToBackend,
  type ExerciseCompletionRecord,
} from "./exercise-activity-storage";

const QUESTIONNAIRE_RESULT_KEY = "fra_questionnaire_result_v1";
const EXPECTED_QUESTION_COUNT = 7;

export type QuestionnaireResult = {
  fesI: number;
  answers: Record<number, number>;
  completedAt: string;
};

export async function saveQuestionnaireResult(
  result: QuestionnaireResult
): Promise<void> {
  await AsyncStorage.setItem(QUESTIONNAIRE_RESULT_KEY, JSON.stringify(result));
}

export async function submitQuestionnaireResult(
  result: QuestionnaireResult
): Promise<void> {
  await saveQuestionnaireResult(result);

  const answerValues = Object.values(result.answers);
  const allAnswered =
    Object.keys(result.answers).length === EXPECTED_QUESTION_COUNT &&
    answerValues.length === EXPECTED_QUESTION_COUNT &&
    answerValues.every((s) => typeof s === "number" && s >= 1 && s <= 4);
  if (!allAnswered) return;

  const record: ExerciseCompletionRecord = {
    id: `fesi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: "fes_i_questionnaire",
    exerciseName: "FES-I Questionnaire",
    category: "assessment",
    completedAt: result.completedAt,
    repCount: 0,
    setsCompleted: 1,
    setsTarget: 1,
    durationSec: 0,
    totalReps: 0,
    repsPerSet: [0],
    unilateral: false,
    angleSummaries: [],
    feedbackEvents: [],
    avgScore: null,
    framesAnalyzed: 0,
    fesI: result.fesI,
    questionnaireAnswers: result.answers,
  };

  void submitActivityToBackend(record);
}

export async function getQuestionnaireResult(): Promise<QuestionnaireResult | null> {
  const raw = await AsyncStorage.getItem(QUESTIONNAIRE_RESULT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<QuestionnaireResult>;
    if (typeof parsed.fesI !== "number") return null;
    if (typeof parsed.completedAt !== "string") return null;
    if (!parsed.answers || typeof parsed.answers !== "object") return null;

    return {
      fesI: parsed.fesI,
      answers: parsed.answers as Record<number, number>,
      completedAt: parsed.completedAt,
    };
  } catch {
    return null;
  }
}
