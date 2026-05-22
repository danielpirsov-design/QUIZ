import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetGame, useSubmitAnswer } from "@workspace/api-client-react";
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

function useQuizQuestions(quizId: number, gameId: number) {
  return useQuery({
    queryKey: [`quiz-questions-${quizId}`, gameId],
    queryFn: async () => {
      const params = gameId ? `?gameId=${gameId}` : "";
      const res = await fetch(`${BASE_URL}/api/quizzes/${quizId}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("fail");
      const d = await res.json();
      return d.questions as Array<{
        id: number; orderIndex: number; questionText: string; options: string[];
        questionType: string; audioUrl?: string | null; timeLimit: number;
      }>;
    },
    enabled: !!quizId,
  });
}

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);
  const scaleAnim = useRef(new Animated.Value(1.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      scaleAnim.setValue(1.5);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    };
    animate();
  }, [count]);

  useEffect(() => {
    if (count <= 0) { onDone(); return; }
    const t = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCount(c => c - 1);
    }, 900);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.countdownOverlay}>
        <Animated.Text style={[styles.countdownNumber, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          {count > 0 ? count : "GO!"}
        </Animated.Text>
        <Text style={styles.countdownLabel}>Get ready!</Text>
      </View>
    </View>
  );
}

export default function PlayScreen() {
  const { id, participantId, nickname } = useLocalSearchParams<{ id: string; participantId: string; nickname: string }>();
  const gameId = parseInt(id || "0");
  const pId = parseInt(participantId || "0");
  const insets = useSafeAreaInsets();

  const { data: game } = useGetGame(gameId, { query: { refetchInterval: 1200, enabled: !!gameId, queryKey: [`/api/games/${gameId}`] } });
  const { data: questions } = useQuizQuestions((game as any)?.quizId || 0, gameId);
  const submitMut = useSubmitAnswer();

  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number; correctAnswer: string; streak?: number; coins?: number } | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [phase, setPhase] = useState<"countdown" | "answering" | "done">("countdown");
  const [showCountdown, setShowCountdown] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const prevQRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const game_ = game as any;
  const sortedQs = questions ? [...questions].sort((a, b) => a.orderIndex - b.orderIndex) : undefined;
  const currentQ = sortedQs && game_?.currentQuestion != null ? sortedQs[(game_?.currentQuestion) - 1] : undefined;
  const gamePhase = game_?.questionPhase ?? "question";
  const gameMode = game_?.gameMode ?? "live";
  const relayInfo = game_?.relayInfo;
  const isRelayMode = gameMode === "relay";
  const isBombMode = gameMode === "bomb";
  const isMyRelayTurn = !isRelayMode || (relayInfo?.activeParticipantIds?.includes(pId) ?? true);

  useEffect(() => {
    if (game_?.status === "ended") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/results/[id]", params: { id, participantId, nickname } });
    }
  }, [game_?.status]);

  useEffect(() => {
    if (game_?.currentQuestion == null) return;
    const qIdx = game_?.currentQuestion;
    if (qIdx !== prevQRef.current) {
      prevQRef.current = qIdx;
      setAnswered(false);
      setSelectedIdx(null);
      setAnswerResult(null);
      setShortAnswer("");
      setShowCountdown(true);

      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [game_?.currentQuestion]);

  useEffect(() => {
    if (gamePhase === "leaderboard") setPhase("done");
  }, [gamePhase]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTimer = useCallback(() => {
    setPhase("answering");
    startRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    const limit = currentQ?.timeLimit ?? 20;
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev == null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentQ?.timeLimit]);

  const handleAnswer = useCallback(async (answer: string, optionIdx?: number) => {
    if (answered || !currentQ || !isMyRelayTurn || eliminated) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(true);
    if (optionIdx != null) setSelectedIdx(optionIdx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const timeSpent = Date.now() - startRef.current;
      const res = await submitMut.mutateAsync({
        id: gameId,
        data: { questionId: currentQ.id, answer, participantId: pId, timeSpent },
      });
      const data = res as any;
      const correct = data?.correct ?? false;
      setAnswerResult({
        correct,
        points: data?.pointsEarned ?? data?.points ?? 0,
        correctAnswer: data?.correctAnswer ?? "",
        streak: data?.streak,
        coins: data?.coinsEarned,
      });
      if (correct) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (data?.eliminated && isBombMode) {
        setEliminated(true);
      }
    } catch {
      setAnswerResult({ correct: false, points: 0, correctAnswer: "" });
    }
  }, [answered, currentQ, isMyRelayTurn, gameId, pId, submitMut, eliminated, isBombMode]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 20) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 20) : insets.bottom;

  if (!game_ || !currentQ) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.yellow} />
          <Text style={styles.waitText}>Waiting for the host...</Text>
        </View>
      </View>
    );
  }

  if (eliminated) {
    return (
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 60 }}>💣</Text>
          <Text style={styles.eliminatedTitle}>You're out!</Text>
          <Text style={styles.eliminatedSubtitle}>You got a wrong answer in Bomb mode</Text>
          <View style={[styles.resultPill, { backgroundColor: "#ef444422", borderColor: "#ef4444" }]}>
            <Feather name="eye" size={18} color={C.whiteMid} />
            <Text style={[styles.resultPillText, { color: C.whiteMid }]}>Spectating the rest of the game</Text>
          </View>
        </View>
      </View>
    );
  }

  if (gamePhase === "leaderboard") {
    return (
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
        <View style={styles.center}>
          <Feather name="bar-chart-2" size={48} color={C.yellow} />
          <Text style={styles.phaseTitle}>Scores incoming...</Text>
          <Text style={styles.phaseSubtitle}>Next question starting soon</Text>
          {answerResult && (
            <View style={[styles.resultPill, { backgroundColor: answerResult.correct ? "#22c55e22" : "#ef444422", borderColor: answerResult.correct ? "#22c55e" : "#ef4444" }]}>
              <Feather name={answerResult.correct ? "check-circle" : "x-circle"} size={20} color={answerResult.correct ? "#22c55e" : "#ef4444"} />
              <Text style={[styles.resultPillText, { color: answerResult.correct ? "#22c55e" : "#ef4444" }]}>
                {answerResult.correct ? `+${answerResult.points} pts` : "Incorrect"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const isShortAnswer = currentQ.questionType === "short_answer";
  const isAudio = currentQ.questionType === "audio";
  const isTrueFalse = currentQ.questionType === "true_false";
  const displayOptions = isTrueFalse ? ["True", "False"] : currentQ.options;
  const qCount = questions?.length ?? 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <View style={styles.qProgress}>
            <Text style={styles.qProgressText}>Q{currentQ.orderIndex}/{qCount}</Text>
          </View>
          {timeLeft != null && phase === "answering" && (
            <View style={[styles.timerBadge, timeLeft <= 5 && styles.timerBadgeUrgent]}>
              <Text style={[styles.timerText, timeLeft <= 5 && styles.timerTextUrgent]}>{timeLeft}</Text>
            </View>
          )}
          <Text style={styles.scoreText} numberOfLines={1}>{nickname}</Text>
        </View>

        {/* Game mode badge */}
        {isBombMode && (
          <View style={[styles.relayBanner, { backgroundColor: "#dc2626" }]}>
            <Text style={styles.relayBannerText}>💣 BOMB MODE — No second chances!</Text>
          </View>
        )}

        {/* Relay info */}
        {isRelayMode && (
          <View style={[styles.relayBanner, isMyRelayTurn ? styles.relayBannerActive : styles.relayBannerWait]}>
            <Feather name="flag" size={14} color={C.white} />
            <Text style={styles.relayBannerText}>
              {isMyRelayTurn ? "Your turn!" : "Waiting for your turn..."}
            </Text>
          </View>
        )}

        {/* Question card */}
        <View style={styles.questionCard}>
          {isAudio && currentQ.audioUrl ? (
            <View style={styles.audioCard}>
              <Feather name="volume-2" size={28} color={C.yellow} />
              <Text style={styles.audioLabel}>Audio Question</Text>
              <Text style={styles.questionText}>{currentQ.questionText}</Text>
              <Text style={styles.audioHint}>Listen carefully and choose your answer</Text>
            </View>
          ) : (
            <Text style={styles.questionText}>{currentQ.questionText}</Text>
          )}
        </View>

        {/* Answer section */}
        <View style={styles.answersSection}>
          {answered && answerResult ? (
            <View style={[styles.resultCard, { backgroundColor: answerResult.correct ? "#22c55e22" : "#ef444422", borderColor: answerResult.correct ? "#22c55e" : "#ef4444" }]}>
              <Feather name={answerResult.correct ? "check-circle" : "x-circle"} size={36} color={answerResult.correct ? "#22c55e" : "#ef4444"} />
              <Text style={[styles.resultTitle, { color: answerResult.correct ? "#22c55e" : "#ef4444" }]}>
                {answerResult.correct ? "Correct!" : "Wrong!"}
              </Text>
              {answerResult.correct && (
                <View style={styles.rewardRow}>
                  <Text style={styles.resultPoints}>+{answerResult.points} pts</Text>
                  {answerResult.streak && answerResult.streak > 1 && (
                    <Text style={styles.streakBadge}>🔥 {answerResult.streak}x streak</Text>
                  )}
                  {answerResult.coins && answerResult.coins > 0 && (
                    <Text style={styles.coinBadge}>🪙 +{answerResult.coins}</Text>
                  )}
                </View>
              )}
              {!answerResult.correct && answerResult.correctAnswer && (
                <Text style={styles.resultCorrect}>Answer: {answerResult.correctAnswer}</Text>
              )}
              <Text style={styles.waitingNext}>Waiting for next question...</Text>
            </View>
          ) : isShortAnswer ? (
            <View style={styles.shortAnswerBox}>
              <TextInput
                style={styles.shortAnswerInput}
                placeholder="Type your answer..."
                placeholderTextColor={C.whiteLow}
                value={shortAnswer}
                onChangeText={setShortAnswer}
                editable={!answered && isMyRelayTurn && phase === "answering"}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => { if (shortAnswer.trim()) handleAnswer(shortAnswer.trim()); }}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.submitShortBtn,
                  (!shortAnswer.trim() || answered || !isMyRelayTurn || phase !== "answering") && styles.submitShortBtnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                disabled={!shortAnswer.trim() || answered || !isMyRelayTurn || phase !== "answering"}
                onPress={() => { if (shortAnswer.trim()) handleAnswer(shortAnswer.trim()); }}
              >
                <Feather name="send" size={20} color={C.purpleDeep} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.optionsGrid}>
              {displayOptions.map((opt, idx) => {
                const style_ = ANSWER_STYLES[idx % ANSWER_STYLES.length];
                const isSelected = selectedIdx === idx;
                return (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.optionBtn,
                      { backgroundColor: style_.bg },
                      (answered || !isMyRelayTurn || phase !== "answering") && !isSelected && styles.optionDimmed,
                      isSelected && styles.optionSelected,
                      pressed && !answered && phase === "answering" && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                    disabled={!!answered || !isMyRelayTurn || phase !== "answering"}
                    onPress={() => handleAnswer(opt, idx)}
                  >
                    <View style={styles.optionLabelCircle}>
                      <Text style={styles.optionLabel}>{style_.label}</Text>
                    </View>
                    <Text style={styles.optionText} numberOfLines={3}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!answered && !isMyRelayTurn && isRelayMode && (
            <View style={styles.spectateBox}>
              <Feather name="eye" size={24} color={C.whiteMid} />
              <Text style={styles.spectateText}>Spectating — wait for your turn</Text>
            </View>
          )}
        </View>
      </View>

      {showCountdown && (
        <CountdownOverlay onDone={() => { setShowCountdown(false); startTimer(); }} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  waitText: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: C.whiteMid, textAlign: "center" },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 12,
  },
  qProgress: { backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  qProgressText: { fontFamily: "Inter_700Bold", fontSize: 13, color: C.whiteMid },
  timerBadge: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.surfaceBright,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.border,
  },
  timerBadgeUrgent: { backgroundColor: "#ef444433", borderColor: "#ef4444" },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.white },
  timerTextUrgent: { color: "#ef4444" },
  scoreText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.whiteMid, maxWidth: 100 },
  relayBanner: { marginHorizontal: 20, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
  relayBannerActive: { backgroundColor: "#059669" },
  relayBannerWait: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  relayBannerText: { fontFamily: "Inter_700Bold", fontSize: 13, color: C.white },
  questionCard: {
    marginHorizontal: 16, marginVertical: 12, backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24,
    minHeight: 100, alignItems: "center", justifyContent: "center",
  },
  questionText: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white, textAlign: "center", lineHeight: 30 },
  audioCard: { alignItems: "center", gap: 10 },
  audioLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.yellow, letterSpacing: 1 },
  audioHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.whiteMid, textAlign: "center" },
  answersSection: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  optionsGrid: { flex: 1, gap: 10 },
  optionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64,
  },
  optionDimmed: { opacity: 0.45 },
  optionSelected: { opacity: 1, borderWidth: 3, borderColor: C.white },
  optionLabelCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  optionLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white },
  optionText: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white, flex: 1 },
  shortAnswerBox: { flexDirection: "row", gap: 12, marginTop: 12 },
  shortAnswerInput: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 17, paddingHorizontal: 18, paddingVertical: 14,
  },
  submitShortBtn: { backgroundColor: C.yellow, borderRadius: 16, width: 56, alignItems: "center", justifyContent: "center" },
  submitShortBtnDisabled: { opacity: 0.4 },
  resultCard: {
    flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 24, borderWidth: 2,
    gap: 10, padding: 28,
  },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 28 },
  rewardRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  resultPoints: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#22c55e" },
  streakBadge: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#f97316" },
  coinBadge: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.yellow },
  resultCorrect: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.whiteMid, textAlign: "center" },
  waitingNext: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.whiteLow, marginTop: 8 },
  phaseTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: C.white, textAlign: "center" },
  phaseSubtitle: { fontFamily: "Inter_400Regular", fontSize: 16, color: C.whiteMid, textAlign: "center" },
  resultPill: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 12,
  },
  resultPillText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  spectateBox: { alignItems: "center", gap: 12, paddingTop: 40 },
  spectateText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.whiteMid, textAlign: "center" },
  countdownOverlay: {
    flex: 1, backgroundColor: "rgba(26,0,80,0.92)",
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  countdownNumber: { fontFamily: "Inter_700Bold", fontSize: 96, color: C.yellow },
  countdownLabel: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: C.whiteMid },
  eliminatedTitle: { fontFamily: "Inter_700Bold", fontSize: 30, color: "#ef4444" },
  eliminatedSubtitle: { fontFamily: "Inter_400Regular", fontSize: 16, color: C.whiteMid, textAlign: "center" },
});
