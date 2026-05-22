import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const BASE_URL = "https://quizdes.com";

const ANSWER_STYLES = [
  { bg: "#e21b3c", label: "A" },
  { bg: "#1368ce", label: "B" },
  { bg: "#d89e00", label: "C" },
  { bg: "#26890c", label: "D" },
];

type Question = {
  id: number;
  orderIndex: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  questionType: string;
  timeLimit: number;
};

function useQuiz(quizId: number) {
  return useQuery({
    queryKey: [`practice-quiz-${quizId}`],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/quizzes/${quizId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<{ title: string; questions: Question[] }>;
    },
    enabled: !!quizId,
  });
}

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quizId = parseInt(id || "0");
  const insets = useSafeAreaInsets();

  const { data: quiz, isLoading, error } = useQuiz(quizId);
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const questions = quiz?.questions ?? [];
  const currentQ = questions[qIdx];

  useEffect(() => {
    if (!currentQ) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const limit = currentQ.timeLimit || 20;
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev == null || prev <= 1) {
          clearInterval(timerRef.current!);
          if (!answered) handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIdx, currentQ?.id]);

  const handleTimeout = () => {
    setAnswered(true);
    setIsCorrect(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const submitAnswer = (answer: string, optIdx?: number) => {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (optIdx != null) setSelectedIdx(optIdx);
    setAnswered(true);

    const correct = currentQ?.questionType === "short_answer"
      ? answer.trim().toLowerCase() === (currentQ.correctAnswer ?? "").toLowerCase()
      : answer === currentQ?.correctAnswer;

    setIsCorrect(correct);
    if (correct) {
      setScore(s => s + 1000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const goNext = () => {
    if (qIdx + 1 >= questions.length) {
      setDone(true);
    } else {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setQIdx(q => q + 1);
      setAnswered(false);
      setSelectedIdx(null);
      setIsCorrect(null);
      setShortAnswer("");
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 20) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 20) : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={C.yellow} /></View>
      </View>
    );
  }

  if (error || !quiz) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={C.whiteLow} />
          <Text style={styles.errorText}>Quiz not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtnSmall}>
            <Text style={styles.backBtnSmallText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (done) {
    const total = questions.length;
    const correct = Math.round(score / 1000);
    const pct = Math.round((correct / total) * 100);
    return (
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
        <View style={styles.doneContainer}>
          <Text style={styles.logo}>QUIZDES</Text>
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</Text>
            <Text style={styles.doneTitle}>Practice Complete!</Text>
            <Text style={styles.doneQuizTitle}>{quiz.title}</Text>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatNum}>{correct}/{total}</Text>
              <Text style={styles.doneStatLabel}>Correct</Text>
            </View>
            <View style={[styles.doneBar, { backgroundColor: C.surface }]}>
              <View style={[styles.doneBarFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? "#22c55e" : pct >= 50 ? C.yellow : "#ef4444" }]} />
            </View>
            <Text style={styles.donePct}>{pct}% accuracy</Text>
          </View>
          <View style={styles.doneActions}>
            <Pressable
              style={({ pressed }) => [styles.doneActionBtn, { backgroundColor: C.yellow }, pressed && { opacity: 0.85 }]}
              onPress={() => { setQIdx(0); setAnswered(false); setSelectedIdx(null); setIsCorrect(null); setShortAnswer(""); setScore(0); setDone(false); }}
            >
              <Feather name="refresh-cw" size={18} color={C.purpleDeep} />
              <Text style={[styles.doneActionText, { color: C.purpleDeep }]}>Retry</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.doneActionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, pressed && { opacity: 0.85 }]}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={18} color={C.white} />
              <Text style={[styles.doneActionText, { color: C.white }]}>Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const isShortAnswer = currentQ?.questionType === "short_answer";
  const isTrueFalse = currentQ?.questionType === "true_false";
  const displayOptions = isTrueFalse ? ["True", "False"] : (currentQ?.options ?? []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <Feather name="x" size={22} color={C.whiteMid} />
          </Pressable>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((qIdx) / questions.length) * 100}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{qIdx + 1} / {questions.length}</Text>
          </View>
          {timeLeft != null && (
            <View style={[styles.timerBadge, timeLeft <= 5 && styles.timerBadgeUrgent]}>
              <Text style={[styles.timerText, timeLeft <= 5 && styles.timerTextUrgent]}>{timeLeft}</Text>
            </View>
          )}
        </View>

        {/* Practice label */}
        <View style={styles.practiceLabel}>
          <Feather name="zap" size={13} color={C.yellow} />
          <Text style={styles.practiceLabelText}>SOLO PRACTICE</Text>
        </View>

        {/* Question */}
        <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
          <Text style={styles.questionText}>{currentQ?.questionText}</Text>
        </Animated.View>

        {/* Answers */}
        <View style={styles.answersArea}>
          {answered ? (
            <View style={[styles.resultCard, { borderColor: isCorrect ? "#22c55e" : "#ef4444", backgroundColor: isCorrect ? "#22c55e11" : "#ef444411" }]}>
              <Feather name={isCorrect ? "check-circle" : "x-circle"} size={36} color={isCorrect ? "#22c55e" : "#ef4444"} />
              <Text style={[styles.resultTitle, { color: isCorrect ? "#22c55e" : "#ef4444" }]}>
                {isCorrect ? "Correct!" : "Wrong!"}
              </Text>
              {!isCorrect && <Text style={styles.correctAnswerText}>Answer: {currentQ?.correctAnswer}</Text>}
              {currentQ?.explanation ? (
                <Text style={styles.explanationText}>{currentQ.explanation}</Text>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
                onPress={goNext}
              >
                <Text style={styles.nextBtnText}>{qIdx + 1 >= questions.length ? "See Results" : "Next"}</Text>
                <Feather name="arrow-right" size={18} color={C.purpleDeep} />
              </Pressable>
            </View>
          ) : isShortAnswer ? (
            <View style={styles.shortAnswerBox}>
              <TextInput
                style={styles.shortAnswerInput}
                placeholder="Type your answer..."
                placeholderTextColor={C.whiteLow}
                value={shortAnswer}
                onChangeText={setShortAnswer}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => { if (shortAnswer.trim()) submitAnswer(shortAnswer.trim()); }}
              />
              <Pressable
                style={({ pressed }) => [styles.submitShortBtn, !shortAnswer.trim() && styles.submitShortBtnDisabled, pressed && { opacity: 0.8 }]}
                disabled={!shortAnswer.trim()}
                onPress={() => { if (shortAnswer.trim()) submitAnswer(shortAnswer.trim()); }}
              >
                <Feather name="send" size={20} color={C.purpleDeep} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.optionsGrid}>
              {displayOptions.map((opt, idx) => {
                const s = ANSWER_STYLES[idx % ANSWER_STYLES.length];
                const isSelected = selectedIdx === idx;
                return (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.optionBtn,
                      { backgroundColor: s.bg },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => submitAnswer(opt, idx)}
                    disabled={answered}
                  >
                    <View style={styles.optionLabelCircle}>
                      <Text style={styles.optionLabel}>{s.label}</Text>
                    </View>
                    <Text style={styles.optionText} numberOfLines={3}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: C.whiteMid },
  backBtnSmall: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  backBtnSmallText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.whiteMid },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  headerBack: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  progressWrap: { flex: 1, gap: 4 },
  progressTrack: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.yellow, borderRadius: 3 },
  progressLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.whiteMid },
  timerBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceBright, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.border },
  timerBadgeUrgent: { backgroundColor: "#ef444433", borderColor: "#ef4444" },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.white },
  timerTextUrgent: { color: "#ef4444" },
  practiceLabel: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, marginBottom: 4 },
  practiceLabelText: { fontFamily: "Inter_700Bold", fontSize: 11, color: C.yellow, letterSpacing: 2 },
  questionCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, padding: 24, minHeight: 100,
    alignItems: "center", justifyContent: "center",
  },
  questionText: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white, textAlign: "center", lineHeight: 30 },
  answersArea: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  optionsGrid: { flex: 1, gap: 10 },
  optionBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  optionLabelCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white },
  optionText: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white, flex: 1 },
  shortAnswerBox: { flexDirection: "row", gap: 12, marginTop: 12 },
  shortAnswerInput: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 17, paddingHorizontal: 18, paddingVertical: 14,
  },
  submitShortBtn: { backgroundColor: C.yellow, borderRadius: 16, width: 56, alignItems: "center", justifyContent: "center" },
  submitShortBtnDisabled: { opacity: 0.4 },
  resultCard: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 24, borderWidth: 2, gap: 12, padding: 28 },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  correctAnswerText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.whiteMid, textAlign: "center" },
  explanationText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.whiteLow, textAlign: "center", marginTop: 4 },
  nextBtn: { marginTop: 16, backgroundColor: C.yellow, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", gap: 8 },
  nextBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.purpleDeep },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 24 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.yellow, letterSpacing: 3 },
  doneCard: { width: "100%", backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: "center", gap: 12 },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: C.white },
  doneQuizTitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.whiteMid, textAlign: "center" },
  doneStat: { alignItems: "center" },
  doneStatNum: { fontFamily: "Inter_700Bold", fontSize: 40, color: C.yellow },
  doneStatLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.whiteMid },
  doneBar: { width: "100%", height: 12, borderRadius: 6, overflow: "hidden" },
  doneBarFill: { height: "100%", borderRadius: 6 },
  donePct: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.whiteMid },
  doneActions: { flexDirection: "row", gap: 12, width: "100%" },
  doneActionBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  doneActionText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
