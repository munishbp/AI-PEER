import AsyncStorage from "@react-native-async-storage/async-storage";

const QUESTIONNAIRE_RESULT_KEY = "fra_questionnaire_result_v1";

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
