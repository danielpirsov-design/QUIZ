import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetQuiz, useCreateGame } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const GAME_MODES = [
  { key: "live",         emoji: "🎮", label: "Live Classic" },
  { key: "bomb",         emoji: "💣", label: "Bomb Mode"    },
  { key: "classic_plus", emoji: "📱", label: "Classic+"     },
  { key: "volcano",      emoji: "🌋", label: "Volcano"      },
  { key: "relay",        emoji: "🏁", label: "Relay Race"   },
  { key: "self_paced",   emoji: "⏱", label: "Self-Paced"   },
] as const;

const Q_TYPE_ICONS: Record<string, string> = {
  multiple_choice: "list",
  true_false: "check-circle",
  short_answer: "edit-2",
  audio: "volume-2",
};

export default function QuizDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: quiz, isLoading } = useGetQuiz(parseInt(id || "0"));
  const [showAllQ, setShowAllQ] = useState(false);
  const [hostingMode, setHostingMode] = useState<string | null>(null);
  const createGameMut = useCreateGame();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 16) : insets.top;

  const hostGame = async (mode: string) => {
    if (!quiz) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHostingMode(mode);
    try {
      const result = await createGameMut.mutateAsync({ data: { quizId: quiz.id, gameMode: mode } });
      const token = (result as any).hostToken;
      if (token) {
        router.push(`/host/${token}` as any);
      }
    } catch {
    } finally {
      setHostingMode(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.yellow} size="large" />
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={[styles.root, { paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={48} color={C.whiteLow} />
        <Text style={{ color: C.whiteLow, marginTop: 12, fontFamily: "Inter_400Regular" }}>Quiz not found</Text>
      </View>
    );
  }

  const questions = (quiz as any).questions ?? [];
  const visibleQ = showAllQ ? questions : questions.slice(0, 5);

  const startPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/practice/${quiz.id}`);
  };

  const goEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/quiz-edit/${quiz.id}` as any);
  };

  return (
    <ScrollView
      style={[styles.root]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Quiz</Text>
        <Pressable onPress={goEdit} style={styles.editBtn}>
          <Feather name="edit-2" size={18} color={C.yellow} />
        </Pressable>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Feather name="book-open" size={32} color={C.yellow} />
        </View>
        <Text style={styles.quizTitle}>{quiz.title}</Text>
        {quiz.description ? <Text style={styles.quizDesc}>{quiz.description}</Text> : null}
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Feather name="help-circle" size={13} color={C.whiteLow} />
            <Text style={styles.metaBadgeText}>{questions.length} questions</Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: quiz.visibility === "public" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)" }]}>
            <Feather name={quiz.visibility === "public" ? "globe" : "lock"} size={13} color={quiz.visibility === "public" ? C.green : C.whiteLow} />
            <Text style={[styles.metaBadgeText, { color: quiz.visibility === "public" ? C.green : C.whiteLow }]}>{quiz.visibility}</Text>
          </View>
        </View>
        <Text style={styles.creatorText}>by {quiz.creatorName ?? "Unknown"}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.practiceBtn} onPress={startPractice}>
          <Feather name="play" size={18} color="#111" />
          <Text style={styles.practiceBtnText}>Solo Practice</Text>
        </Pressable>
        <Pressable style={styles.editActionBtn} onPress={goEdit}>
          <Feather name="edit-2" size={17} color={C.white} />
          <Text style={styles.editActionBtnText}>Edit Quiz</Text>
        </Pressable>
      </View>

      {/* Host Live Game */}
      <View style={styles.questionsSection}>
        <Text style={styles.sectionLabel}>Host Live Game</Text>
        <View style={styles.modeGrid}>
          {GAME_MODES.map((m) => {
            const loading = hostingMode === m.key;
            return (
              <Pressable
                key={m.key}
                style={[styles.modeBtn, loading && { opacity: 0.6 }]}
                onPress={() => hostGame(m.key)}
                disabled={!!hostingMode}
              >
                {loading
                  ? <ActivityIndicator size="small" color={C.yellow} />
                  : <Text style={styles.modeEmoji}>{m.emoji}</Text>
                }
                <Text style={styles.modeLabel}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Questions preview */}
      {questions.length > 0 && (
        <View style={styles.questionsSection}>
          <Text style={styles.sectionLabel}>Questions</Text>
          <View style={styles.questionsList}>
            {visibleQ.map((q: any, i: number) => (
              <View key={q.id} style={styles.questionRow}>
                <View style={styles.qNum}>
                  <Text style={styles.qNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qText} numberOfLines={2}>{q.questionText}</Text>
                  <View style={styles.qMeta}>
                    <Feather name={(Q_TYPE_ICONS[q.questionType] || "circle") as any} size={11} color={C.whiteLow} />
                    <Text style={styles.qMetaText}>{q.questionType?.replace("_", " ")}</Text>
                    <Text style={styles.qMetaText}>• {q.timeLimit}s</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          {questions.length > 5 && (
            <Pressable style={styles.showMoreBtn} onPress={() => setShowAllQ(v => !v)}>
              <Text style={styles.showMoreText}>
                {showAllQ ? "Show less" : `Show all ${questions.length} questions`}
              </Text>
              <Feather name={showAllQ ? "chevron-up" : "chevron-down"} size={14} color={C.yellow} />
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  back: { padding: 4 },
  editBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.white },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 24 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: C.purple,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    borderWidth: 2, borderColor: "rgba(255,204,2,0.3)",
  },
  quizTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.white, textAlign: "center", marginBottom: 8 },
  quizDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.whiteLow, textAlign: "center", marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  metaBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  metaBadgeText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteLow },
  creatorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteLow },
  actions: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  practiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.yellow, borderRadius: 16, height: 56,
  },
  practiceBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111" },
  editActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: 16, height: 50,
    borderWidth: 1, borderColor: C.border,
  },
  editActionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.white },
  hostSection: { gap: 12 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.whiteLow, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeBtn: {
    flex: 1, minWidth: "28%", backgroundColor: C.surface, borderRadius: 14,
    paddingVertical: 14, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: C.border,
  },
  modeEmoji: { fontSize: 22 },
  modeLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.white },
  questionsSection: { paddingHorizontal: 16, marginTop: 8 },
  questionsList: { gap: 8, marginTop: 10 },
  questionRow: { flexDirection: "row", gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  qNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },
  qNumText: { fontFamily: "Inter_700Bold", fontSize: 13, color: C.white },
  qText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.white, marginBottom: 4 },
  qMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  qMetaText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.whiteLow },
  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  showMoreText: { fontFamily: "Inter_600SemiBold", color: C.yellow, fontSize: 13 },
});
