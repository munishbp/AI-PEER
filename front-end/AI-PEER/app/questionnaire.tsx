import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fontSizes, type ContrastPalette } from "../src/theme";
import { usePrefs } from "../src/prefs-context";
import { submitQuestionnaireResult } from "../src/fra-storage";

interface Question {
  id: number;
  text: string;
}

type AssessmentView = "start" | "questions" | "results";

export default function Questionnaire() {
  const [view, setView] = useState<AssessmentView>("start");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const { scaled, colors } = usePrefs();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const warmRed = colors.accent;

  const questions: Question[] = [
    { id: 1, text: t("questionnaire.question1") },
    { id: 2, text: t("questionnaire.question2") },
    { id: 3, text: t("questionnaire.question3") },
    { id: 4, text: t("questionnaire.question4") },
    { id: 5, text: t("questionnaire.question5") },
    { id: 6, text: t("questionnaire.question6") },
    { id: 7, text: t("questionnaire.question7") },
  ];

  const answerOptions = [
    { value: "1", label: t("questionnaire.notAtAll"), score: 1 },
    { value: "2", label: t("questionnaire.somewhat"), score: 2 },
    { value: "3", label: t("questionnaire.fairly"), score: 3 },
    { value: "4", label: t("questionnaire.very"), score: 4 },
  ];

  const handleStart = () => {
    setView("questions");
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswer = (questionId: number, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const handleNext = () => {
    if (!answers[questions[currentQuestion].id]) {
      Alert.alert(t("questionnaire.errorTitle"), t("questionnaire.notAnsweredError"));
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      return;
    }

    setView("results");
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setView("start");
    setCurrentQuestion(0);
    setAnswers({});
  };

  const calculateScore = () => {
    return Object.values(answers).reduce((sum, score) => sum + score, 0);
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 7 && score <= 13) {
      return {
        level: t("questionnaire.lowConcern"),
        color: "#38A169",
        bgColor: "#F0FFF4",
        description:
          t("questionnaire.lowDescription"),
        recommendations: t("questionnaire.lowRecs", { returnObjects: true }) as string[],
      };
    }

    if (score >= 14 && score <= 20) {
      return {
        level: t("questionnaire.moderateConcern"),
        color: "#D69E2E",
        bgColor: "#FFFBEB",
        description:
          t("questionnaire.moderateDescription"),
        recommendations: t("questionnaire.moderateRecs", { returnObjects: true }) as string[],
      };
    }

    return {
      level: t("questionnaire.highConcern"),
      color: "#E53E3E",
      bgColor: "#FED7D7",
      description:
        t("questionnaire.highDescription"),
      recommendations: t("questionnaire.highRecs", { returnObjects: true }) as string[],
    };
  };

  const ProgressBar = ({ progress }: { progress: number }) => (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  );

  if (view === "start") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
              <View>
                    <Text style={[styles.brand, { fontSize: scaled.h2 }]}>AI PEER</Text>
                    <Text style={[styles.subtitle, { fontSize: scaled.small }]}>
                      {t("questionnaire.subtitle")}
                    </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={[styles.backText, { fontSize: scaled.h1/2}]}>{t("questionnaire.quit")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Ionicons name="clipboard-outline" size={24} color={warmRed} />
              <Text style={[styles.cardTitle, { fontSize: scaled.h3 }]}>{t("questionnaire.instructionsTitle")}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { fontSize: scaled.base }]}>- {t("questionnaire.info1")}</Text>
              <Text style={[styles.infoText, { fontSize: scaled.base }]}>- {t("questionnaire.info2")}</Text>
              <Text style={[styles.infoText, { fontSize: scaled.base }]}>- {t("questionnaire.info3")}</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
              <Text style={[styles.primaryButtonText, { fontSize: scaled.base }]}>{t("questionnaire.beginAssessment")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (view === "questions") {
    const currentQ = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
              <View>
                <Text style={[styles.brand, { fontSize: scaled.h2 }]}>AI PEER</Text>
                <Text style={[styles.subtitle, { fontSize: scaled.small }]}>{t("questionnaire.subtitle")}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={[styles.backText, { fontSize: scaled.h1/2}]}>{t("questionnaire.quit")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={{ marginBottom: 16 }}>
              <View style={styles.badge}>
                <Text style={[styles.badgeText, { fontSize: scaled.small }]}>
                  {t("questionnaire.questionOf", { current: currentQuestion + 1, total: questions.length })}
                </Text>
              </View>
              <ProgressBar progress={progress} />
            </View>

            <View style={styles.questionBox}>
              <Text style={[styles.questionLabel, { fontSize: scaled.small }]}>{t("questionnaire.howConcerned")}</Text>
              <Text style={[styles.questionText, { fontSize: scaled.h3 }]}>{currentQ.text}</Text>
            </View>

            <View style={{ gap: 8, marginTop: 16 }}>
              {answerOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    answers[currentQ.id] === option.score && styles.optionSelected,
                  ]}
                  onPress={() => handleAnswer(currentQ.id, option.score)}
                >
                  <Ionicons
                    name={
                      answers[currentQ.id] === option.score
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={answers[currentQ.id] === option.score ? warmRed : colors.muted}
                  />
                  <Text style={[styles.optionText, { fontSize: scaled.base }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionScore, { fontSize: scaled.small }]}>
                    {option.score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={{
                alignItems: "center",
                justifyContent: "space-between",
                flexDirection: "row",
                gap: 8,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  currentQuestion === 0 && styles.disabledButton,
                ]}
                onPress={handleBack}
                disabled={currentQuestion === 0}
              >
                <Ionicons name="arrow-back" size={16} color="#666" />
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { fontSize: Math.round(scaled.h1 * 0.5) },
                  ]}
                >
                  {t("questionnaire.back")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text
                  style={[
                    styles.primaryButtonText,
                    { fontSize: Math.round(scaled.h1 * 0.5) },
                  ]}
                >
                  {currentQuestion === questions.length - 1 ? t("questionnaire.viewResults") : t("questionnaire.next")}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const score = calculateScore();
  const interpretation = getScoreInterpretation(score);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.small }]}>
                {t("questionnaire.subtitle")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
            <Text style={[styles.cardTitle, { fontSize: scaled.h3 }]}>{t("questionnaire.assessmentComplete")}</Text>
          </View>

          <Text style={[styles.thankYouText, { fontSize: scaled.h3 }]}>
            {t("questionnaire.thankYou")}
          </Text>
          <Text style={[styles.resultsText, { fontSize: scaled.base }]}>
            {t("questionnaire.hereAreResults")}
          </Text>

          <View style={[styles.scoreBox, { backgroundColor: interpretation.bgColor }]}>
            <Text style={[styles.scoreLabel, { fontSize: scaled.base }]}>
              {t("questionnaire.yourScoreLabel")}
            </Text>
            <Text
              style={[styles.scoreValue, { color: interpretation.color, fontSize: scaled.h1 }]}
            >
              {score}
            </Text>
            <Text style={[styles.scoreOutOf, { fontSize: scaled.small }]}>{t("questionnaire.outOf")}</Text>
            <View style={[styles.levelBadge, { backgroundColor: interpretation.color }]}>
              <Text style={[styles.levelText, { fontSize: scaled.base }]}>
                {interpretation.level}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaled.base }]}>{t("questionnaire.whatThisMeans")}</Text>
            <Text style={[styles.sectionText, { fontSize: scaled.base }]}>
              {interpretation.description}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaled.base }]}>{t("questionnaire.recommendations")}</Text>
            {interpretation.recommendations.map((rec) => (
              <View key={rec} style={styles.recItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={warmRed} />
                <Text style={[styles.recText, { fontSize: scaled.base }]}>{rec}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaled.base }]}>{t("questionnaire.yourResponses")}</Text>
            {questions.map((q) => (
              <View key={q.id} style={styles.responseItem}>
                <Text style={[styles.responseText, { fontSize: scaled.base }]}>{q.text}</Text>
                <View style={styles.responseBadge}>
                  <Text style={[styles.responseBadgeText, { fontSize: scaled.small }]}>
                    {t("questionnaire.score")}: {answers[q.id]}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View
            style={{
              alignItems: "center",
              justifyContent: "space-between",
              flexDirection: "row",
              gap: 8,
              marginTop: 20,
            }}
          >
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart}>
              <Text style={[styles.secondaryButtonText, { fontSize: scaled.h1/2}]}>{t("questionnaire.takeAgain")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={async () => {
                try {
                  await submitQuestionnaireResult({
                    fesI: score,
                    answers,
                    completedAt: new Date().toISOString(),
                  });
                  Alert.alert(t("questionnaire.savedTitle"), t("questionnaire.savedMessage"));
                  router.back();
                } catch {
                  Alert.alert(t("questionnaire.errorTitle"), t("questionnaire.unableToSaveResults"));
                }
              }}
            >
              <Text style={[styles.primaryButtonText, { fontSize: scaled.h1/2 }]}>{t("questionnaire.saveResults")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ContrastPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { padding: 16, gap: 12 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    brand: { fontWeight: "800", color: colors.text },
    subtitle: { color: colors.muted },
    backBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    backText: { color: colors.text, fontSize: fontSizes.small, fontWeight: "600" },
    card: {
      backgroundColor: colors.bgTile,
      borderRadius: 12,
      padding: 14,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 1.5 },
      }),
    },
    cardTitle: { fontWeight: "800", fontSize: 18, color: colors.text },
    infoBox: {
      backgroundColor: colors.background,
      borderColor: colors.bgTile,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      gap: 10,
    },
    infoText: { color: colors.text, lineHeight: 20 },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginTop: 20,
      gap: 5,
    },
    primaryButtonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    badge: {
      alignSelf: "flex-start",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.bgTile,
      marginBottom: 10,
    },
    badgeText: { color: colors.text, fontWeight: "700" },
    progressBar: {
      width: "100%",
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: colors.accent },
    questionBox: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.bgTile,
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },
    questionLabel: { color: colors.muted, fontWeight: "600" },
    questionText: { color: colors.text, fontWeight: "700" },
    option: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.bgTile,
      borderWidth: 2,
      borderColor: colors.background,
      borderRadius: 8,
      gap: 12,
    },
    optionSelected: { borderColor: colors.accent, backgroundColor: colors.background },
    optionText: { flex: 1, color: colors.text },
    optionScore: { color: colors.muted, fontWeight: "600" },
    secondaryButton: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginTop: 20,
      gap: 5,
      borderWidth: 1,
      borderColor: colors.bgTile,
    },
    secondaryButtonText: { color: colors.text, fontWeight: "700", fontSize: 14 },
    disabledButton: { opacity: 0.5 },
    progressText: {
      textAlign: "center",
      color: colors.muted,
      marginTop: 12,
      fontSize: 12,
    },
    thankYouText: {
      fontSize: 18,
      color: colors.text,
      textAlign: "center",
      marginBottom: 4,
    },
    resultsText: { color: colors.muted, textAlign: "center" },
    scoreBox: {
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      marginTop: 16,
    },
    scoreLabel: { fontSize: 14, color: colors.muted, marginBottom: 8 },
    scoreValue: { fontSize: 48, fontWeight: "900", marginBottom: 4 },
    scoreOutOf: { fontSize: 12, color: colors.muted },
    levelBadge: {
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginTop: 12,
    },
    levelText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    section: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    sectionTitle: { fontWeight: "600", color: colors.text, marginBottom: 8 },
    sectionText: { color: colors.text, lineHeight: 20 },
    recItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 8,
    },
    recText: { flex: 1, color: colors.text },
    responseItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 8,
      backgroundColor: colors.bgTile,
      borderRadius: 6,
      marginBottom: 6,
      gap: 8,
    },
    responseText: { flex: 1, color: colors.text },
    responseBadge: {
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    responseBadgeText: { color: colors.muted },
  });
