import React, { useState } from "react";
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
import { colors, spacing, radii, fontSizes } from "../src/theme";

interface Question {
  id: number;
  text: string;
}

const questions: Question[] = [
  { id: 1, text: "Getting dressed or undressed" },
  { id: 2, text: "Taking a bath or shower" },
  { id: 3, text: "Getting in or out of a chair" },
  { id: 4, text: "Going up or down stairs" },
  {
    id: 5,
    text: "Reaching for something above your head or on the ground",
  },
  { id: 6, text: "Walking up or down a slope" },
  {
    id: 7,
    text: "Going out to a social event (e.g. religious service, family gathering or club meeting)",
  },
];

const answerOptions = [
  { value: "1", label: "Not at all concerned", score: 1 },
  { value: "2", label: "Somewhat concerned", score: 2 },
  { value: "3", label: "Fairly concerned", score: 3 },
  { value: "4", label: "Very concerned", score: 4 },
];

type AssessmentView = "start" | "questions" | "results";

export default function Questionnaire() {
  const [view, setView] = useState<AssessmentView>("start");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

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
      Alert.alert("Error", "Please select an answer before continuing");
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setView("results");
    }
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
        level: "Low Concern",
        color: "#38A169",
        bgColor: "#F0FFF4",
        description:
          "You have expressed low concern about falling during daily activities. Continue with your current activities and maintain your strength and balance.",
        recommendations: [
          "Continue regular physical activity",
          "Maintain home safety practices",
          "Schedule annual check-ups with your doctor",
        ],
      };
    } else if (score >= 14 && score <= 20) {
      return {
        level: "Moderate Concern",
        color: "#D69E2E",
        bgColor: "#FFFBEB",
        description:
          "You have expressed moderate concern about falling. Consider discussing these concerns with your healthcare provider and implementing fall prevention strategies.",
        recommendations: [
          "Talk to your doctor about fall prevention",
          "Consider a balance and strength training program",
          "Review your medications with your healthcare provider",
          "Conduct a home safety assessment",
        ],
      };
    } else {
      return {
        level: "High Concern",
        color: "#E53E3E",
        bgColor: "#FED7D7",
        description:
          "You have expressed high concern about falling during daily activities. We strongly recommend discussing these concerns with your healthcare provider as soon as possible.",
        recommendations: [
          "Schedule an appointment with your doctor promptly",
          "Ask about a referral to a physical therapist",
          "Have a thorough home safety evaluation",
          "Consider using assistive devices if recommended",
          "Review all medications with your healthcare provider",
        ],
      };
    }
  };

  const ProgressBar = ({ progress }: { progress: number }) => (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  );

  // Start View
  if (view === "start") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="clipboard-outline" size={20} color="#2E5AAC" />
              <View>
                <Text style={styles.brand}>AI PEER</Text>
                <Text style={styles.subtitle}>Fall Risk Questionnaire</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={()=> {router.back()}} style={styles.backBtn}>
                <Text style={styles.backText}>Quit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="clipboard-outline" size={24} color={warmRed} />
              <Text style={styles.cardTitle}>Instructions</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                There are 7 questions. Each question asks how concerned you are about the possibility of falling while performing an activity. Please reply thinking about how you usually do the activity. If you currently don't do the activity, please answer to show whether you think you would be concerned about falling IF you did the activity.
              </Text>
              <Text style={[styles.infoText, { marginTop: 12 }]}>
                For each of the following activities, please tick the box which is closest to your own opinion to show how concerned you are that you might fall if you did this activity.
              </Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
              <Text style={styles.primaryButtonText}>Begin Assessment</Text>
            </TouchableOpacity>
            </View>

            
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Questions View
  if (view === "questions") {
    const currentQ = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="clipboard-outline" size={20} color="#2E5AAC" />
              <View>
                <Text style={styles.brand}>AI PEER</Text>
                <Text style={styles.subtitle}>Fall Risk Questionnaire</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={()=> {router.back()}} style={styles.backBtn}>
                <Text style={styles.backText}>Quit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ marginBottom: 16 }}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Question {currentQuestion + 1} of {questions.length}
                </Text>
              </View>
              <ProgressBar progress={progress} />
            </View>

            <View style={styles.questionBox}>
              <Text style={styles.questionLabel}>How concerned are you that you might fall:</Text>
              <Text style={styles.questionText}>{currentQ.text}</Text>
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
                    name={answers[currentQ.id] === option.score ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={answers[currentQ.id] === option.score ? warmRed : "#666"}
                  />
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Text style={styles.optionScore}>{option.score}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ alignItems: "center", justifyContent: "space-between", flexDirection: "row", gap: 5, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.secondaryButton, currentQuestion === 0 && styles.disabledButton]}
                onPress={handleBack}
                disabled={currentQuestion === 0}
              >
                <Ionicons name="arrow-back" size={16} color="#666" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>
                  {currentQuestion === questions.length - 1 ? "View Results" : "Next"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.progressText}>
              {Object.keys(answers).length} of {questions.length} questions answered
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Results View
  const score = calculateScore();
  const interpretation = getScoreInterpretation(score);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="clipboard-outline" size={20} color="#2E5AAC" />
            <Text style={styles.brand}>AI PEER</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Fall Risk Questionnaire</Text>

        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="checkmark-circle" size={24} color="#38A169" />
            <Text style={styles.cardTitle}>Assessment Complete</Text>
          </View>

          <Text style={styles.thankYouText}>Thank you for completing the assessment!</Text>
          <Text style={styles.resultsText}>Here are your results:</Text>

          <View style={[styles.scoreBox, { backgroundColor: interpretation.bgColor }]}>
            <Text style={styles.scoreLabel}>Your Fear of Falling Score</Text>
            <Text style={[styles.scoreValue, { color: interpretation.color }]}>{score}</Text>
            <Text style={styles.scoreOutOf}>out of 28</Text>
            <View style={[styles.levelBadge, { backgroundColor: interpretation.color }]}>
              <Text style={styles.levelText}>{interpretation.level}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What This Means:</Text>
            <Text style={styles.sectionText}>{interpretation.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations:</Text>
            {interpretation.recommendations.map((rec, index) => (
              <View key={index} style={styles.recItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={warmRed} />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Responses:</Text>
            {questions.map((q) => (
              <View key={q.id} style={styles.responseItem}>
                <Text style={styles.responseText}>{q.text}</Text>
                <View style={styles.responseBadge}>
                  <Text style={styles.responseBadgeText}>Score: {answers[q.id]}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ alignItems: "center", justifyContent: "space-between", flexDirection: "row", gap: 5, marginTop: 20 }}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart}>
              <Text style={styles.secondaryButtonText}>Take Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {Alert.alert("Success", "Results saved to your profile"); router.back()}}
            >
              <Text style={styles.primaryButtonText}>Save Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const beige = "#F7EDE4";
const beigeDark = "#E6D4C6";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },
  header: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 3, marginBottom: 6, fontSize: 11, color: "#6B5E55" },
  backBtn: { outlineWidth: 2, padding: 5, outlineOffset: 4, outlineColor: "#db0000ff", borderRadius: 10 },
  backText: { color: "#db0000ff", fontSize: fontSizes.small, fontWeight: "600" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontWeight: "800", fontSize: 18 },
  infoBox: { backgroundColor: "#F4E3D6", borderColor: beigeDark, borderWidth: 1, borderRadius: 8, padding: 12 },
  infoText: { color: "#333", lineHeight: 20 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#F4E3D6", borderRadius: 8 },
  checkText: { color: "#333" },
  primaryButton: {
    backgroundColor: warmRed,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    flexDirection: "row",
    gap: 5,
  },
  primaryButtonText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  badge: { backgroundColor: warmRed, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, alignSelf: "flex-start", marginBottom: 8 },
  badgeText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  progressBar: { height: 4, backgroundColor: "#E0E0E0", borderRadius: 2 },
  progressFill: { height: "100%", backgroundColor: warmRed, borderRadius: 2 },
  questionBox: { backgroundColor: "#F4E3D6", borderColor: beigeDark, borderWidth: 1, borderRadius: 8, padding: 12 },
  questionLabel: { fontSize: 12, color: "#666", marginBottom: 8 },
  questionText: { fontSize: 18, fontWeight: "600", color: "#333" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    gap: 12,
  },
  optionSelected: { borderColor: warmRed, backgroundColor: "#F4E3D6" },
  optionText: { flex: 1, fontSize: 16, color: "#333" },
  optionScore: { fontSize: 14, color: "#666", fontWeight: "600" },
  secondaryButton: {
    backgroundColor: beigeDark,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  secondaryButtonText: { color: "#666", fontWeight: "700", fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  progressText: { textAlign: "center", color: "#666", marginTop: 12, fontSize: 12 },
  thankYouText: { fontSize: 18, color: "#333", textAlign: "center", marginBottom: 4 },
  resultsText: { color: "#666", textAlign: "center" },
  scoreBox: { borderWidth: 2, borderColor: warmRed, borderRadius: 12, padding: 20, alignItems: "center", marginTop: 16 },
  scoreLabel: { fontSize: 14, color: "#666", marginBottom: 8 },
  scoreValue: { fontSize: 48, fontWeight: "900", marginBottom: 4 },
  scoreOutOf: { fontSize: 12, color: "#666" },
  levelBadge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, marginTop: 12 },
  levelText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  section: { marginTop: 16, padding: 12, backgroundColor: beigeDark, borderRadius: 8 },
  sectionTitle: { fontWeight: "600", color: "#333", marginBottom: 8 },
  sectionText: { color: "#333", lineHeight: 20 },
  recItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  recText: { flex: 1, color: "#333" },
  responseItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8, backgroundColor: beigeDark, borderRadius: 6, marginBottom: 6 },
  responseText: { flex: 1, fontSize: 14, color: "#333" },
  responseBadge: { backgroundColor: "#E0E0E0", borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  responseBadgeText: { fontSize: 12, color: "#666" },
});