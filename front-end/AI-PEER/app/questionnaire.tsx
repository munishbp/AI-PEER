import { useState } from "react";
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
import { fontSizes} from "../src/theme";
import { usePrefs } from "../src/prefs-context";

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

  const { scaled } = usePrefs();

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
                <Text style={[styles.brand, { fontSize: scaled.h2 }]}>AI PEER</Text>
                <Text style={[styles.subtitle, { fontSize: scaled.small }]}>Fall Risk Questionnaire</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={() => { router.back(); }} style={styles.backBtn}>
                <Text style={[styles.backText, { fontSize: scaled.h1/2 }]}>Quit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="clipboard-outline" size={24} color={warmRed} />
              <Text style={[styles.cardTitle, { fontSize: scaled.h3 }]}>Instructions</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { marginTop: 22, fontSize: scaled.base }]}>• 7 quick questions</Text>
              <Text style={[styles.infoText, { marginTop: 28, fontSize: scaled.base }]}>• Rate how concerned you'd be about falling during each activity</Text>
              <Text style={[styles.infoText, { marginTop: 28, marginBottom: 22, fontSize: scaled.base }]}>• If you don't do an activity, answer how concerned you'd be if you did</Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
              <Text style={[styles.primaryButtonText, { fontSize: scaled.base }]}>Begin Assessment</Text>
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
                <Text style={[styles.brand, { fontSize: scaled.h2 }]}>AI PEER</Text>
                <Text style={[styles.subtitle, { fontSize: scaled.small }]}>Fall Risk Questionnaire</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={()=> {router.back()}} style={styles.backBtn}>
                <Text style={[styles.backText, { fontSize: scaled.h1/2 }]}>Quit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ marginBottom: 16 }}>
              <View style={styles.badge}>
                <Text style={[styles.badgeText, { fontSize: scaled.small }]}> 
                  Question {currentQuestion + 1} of {questions.length}
                </Text>
              </View>
              <ProgressBar progress={progress} />
            </View>

            <View style={styles.questionBox}>
              <Text style={[styles.questionLabel, { fontSize: scaled.small }]}>How concerned are you that you might fall:</Text>
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
                    name={answers[currentQ.id] === option.score ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={answers[currentQ.id] === option.score ? warmRed : "#666"}
                  />
                  <Text style={[styles.optionText, { fontSize: scaled.base }]}>{option.label}</Text>
                  <Text style={[styles.optionScore, { fontSize: scaled.small }]}>{option.score}</Text>
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
                <Text style={[styles.secondaryButtonText, { fontSize: Math.round(scaled.h1 * 0.5) }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={[styles.primaryButtonText, { fontSize: Math.round(scaled.h1 * 0.5) }]}>
                  {currentQuestion === questions.length - 1 ? "View Results" : "Next"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.progressText, { fontSize: scaled.small }]}> 
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
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.small }]}>Fall Risk Questionnaire</Text>
            </View>
          </View>
        </View>
        

        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="checkmark-circle" size={24} color="#38A169" />
            <Text style={[styles.cardTitle, { fontSize: scaled.h3 }]}>Assessment Complete</Text>
          </View>

          <Text style={[styles.thankYouText, { fontSize: scaled.h3 }]}>Thank you for completing the assessment!</Text>
          <Text style={[styles.resultsText, { fontSize: scaled.base }]}>Here are your results:</Text>

          <View style={[styles.scoreBox, { backgroundColor: interpretation.bgColor }]}>
            <Text style={[styles.scoreLabel, { fontSize: scaled.base }]}>Your Fear of Falling Score</Text>
            <Text style={[styles.scoreValue, { color: interpretation.color, fontSize: scaled.h1 }]}>{score}</Text>
            <Text style={[styles.scoreOutOf, { fontSize: scaled.small }]}>out of 28</Text>
            <View style={[styles.levelBadge, { backgroundColor: interpretation.color }]}>
              <Text style={[styles.levelText, { fontSize: scaled.base }]}>{interpretation.level}</Text>
            </View>
          </View>

<View style={styles.section}>
  <Text style={[styles.sectionTitle, { fontSize: scaled.base }]}>What This Means:</Text>
  <Text style={[styles.sectionText, { fontSize: scaled.base }]}>{interpretation.description}</Text>
</View>

<View style={styles.section}>
  <Text style={[styles.sectionTitle, { fontSize: scaled.base }]}>Recommendations:</Text>
  {interpretation.recommendations.map((rec, index) => (
    <View key={index} style={styles.recItem}>
      <Ionicons name="checkmark-circle-outline" size={16} color={warmRed} />
      <Text style={[styles.recText, { fontSize: scaled.base }]}>{rec}</Text>
    </View>
  ))}
</View>

<View style={styles.section}>
  <Text style={[styles.sectionTitle, { fontSize: scaled.base }]}>Your Responses:</Text>
  {questions.map((q) => (
    <View key={q.id} style={styles.responseItem}>
      <Text style={[styles.responseText, { fontSize: scaled.base }]}>{q.text}</Text>
      <View style={styles.responseBadge}>
        <Text style={[styles.responseBadgeText, { fontSize: scaled.small }]}>Score: {answers[q.id]}</Text>
      </View>
    </View>
  ))}
</View>

<View style={{ alignItems: "center", justifyContent: "space-between", flexDirection: "row", gap: 5, marginTop: 20 }}>
  <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart}>
    <Text style={[styles.secondaryButtonText, { fontSize: scaled.h1/2 }]}>Take Again</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={styles.primaryButton}
    onPress={() => {Alert.alert("Success", "Results saved to your profile"); router.back();}}
  >
    <Text style={[styles.primaryButtonText, { fontSize: scaled.h1/2 }]}>Save Results</Text>
  </TouchableOpacity>
</View>
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
backBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  backgroundColor: "transparent",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#ff9b9bff",
},
backText: { color: "#333", fontSize: fontSizes.small, fontWeight: "600" },
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