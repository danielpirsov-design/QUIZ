import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Platform,
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
  const [hostingMode, setHostingMode] = useState<CreateGameBodyGameMode | null>(null);
  const createGameMut = useCreateGame();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 16) : insets.top;

  const hostGame = async (mode: CreateGameBodyGameMode) => {
    if (!quiz) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHostingMode(mode);
    try {
      const result = await createGameMut.mutateAsync({ data: { quizId: quiz.id, gameMode: mode } });
      const token = (result as any).hostToken;
      if (token) {
        router.push(`/host/${token}` as any);
      }
    } finally {
      setHostingMode(null);
    }
  };

  // rest of file stays the same...
}
