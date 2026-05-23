import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  useGetQuiz,
  useCreateGame,
  type CreateGameBodyGameMode,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const GAME_MODES = [
  { key: "live", emoji: "🎮", label: "Live Classic" },
  { key: "bomb", emoji: "💣", label: "Bomb Mode" },
  { key: "classic_plus", emoji: "📱", label: "Classic+" },
  { key: "volcano", emoji: "🌋", label: "Volcano" },
  { key: "relay", emoji: "🏁", label: "Relay Race" },
  { key: "self_paced", emoji: "⏱", label: "Self-Paced" },
] as const satisfies ReadonlyArray<{
  key: CreateGameBodyGameMode;
  emoji: string;
  label: string;
}>;

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

  const [hostingMode, setHostingMode] =
    useState<CreateGameBodyGameMode | null>(null);

  const createGameMut = useCreateGame();

  const topPad =
    Platform.OS === "web"
      ? Math.max(insets.top, 16)
      : insets.top;

  const hostGame = async (
    mode: CreateGameBodyGameMode
  ) => {
    if (!quiz) return;

    await Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );

    setHostingMode(mode);

    try {
      const result = await createGameMut.mutateAsync({
        data: {
          quizId: quiz.id,
          gameMode: mode,
        },
      });

      const token = (result as any).hostToken;

      if (token) {
        router.push(`/host/${token}` as any);
      }
    } finally {
      setHostingMode(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Quiz not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: 32,
      }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {quiz.title}
        </Text>

        <Text style={styles.description}>
          {quiz.description}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Game Modes
        </Text>

        {GAME_MODES.map((mode) => (
          <Pressable
            key={mode.key}
            style={styles.modeCard}
            onPress={() => hostGame(mode.key)}
          >
            <Text style={styles.modeEmoji}>
              {mode.emoji}
            </Text>

            <Text style={styles.modeLabel}>
              {mode.label}
            </Text>

            {hostingMode === mode.key && (
              <ActivityIndicator />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => setShowAllQ(!showAllQ)}
        >
          <Text style={styles.sectionTitle}>
            Questions ({quiz.questions?.length || 0})
          </Text>
        </Pressable>

        {showAllQ &&
          quiz.questions?.map((q: any, idx: number) => (
            <View
              key={idx}
              style={styles.questionCard}
            >
              <Feather
                name={
                  (Q_TYPE_ICONS[q.type] ||
                    "help-circle") as any
                }
                size={18}
                color={C.primary}
              />

              <Text style={styles.questionText}>
                {q.question}
              </Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    fontSize: 18,
    color: "red",
  },

  header: {
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },

  description: {
    fontSize: 16,
    color: "#666",
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    marginBottom: 12,
    gap: 12,
  },

  modeEmoji: {
    fontSize: 24,
  },

  modeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },

  questionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
  },

  questionText: {
    flex: 1,
    fontSize: 15,
  },
});