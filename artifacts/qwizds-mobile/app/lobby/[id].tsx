import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Animated, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetGame } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const BASE_URL = "https://quizdes.com";

export default function LobbyScreen() {
  const { id, participantId, nickname } = useLocalSearchParams<{ id: string; participantId: string; nickname: string }>();
  const gameId = parseInt(id || "0");
  const insets = useSafeAreaInsets();

  const { data: game } = useGetGame(gameId, { query: { refetchInterval: 1500, enabled: !!gameId, queryKey: [`/api/games/${gameId}`] } });
  const { data: participants } = useParticipants(gameId);

  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (game?.status === "active") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/play/[id]", params: { id, participantId, nickname } });
    }
    if (game?.status === "ended") {
      router.replace({ pathname: "/results/[id]", params: { id, participantId, nickname } });
    }
  }, [game?.status]);

  const isRelay = (game as any)?.gameMode === "relay";
  const quizTitle = (game as any)?.quizTitle ?? "Quiz";
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 20) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 20) : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}>
      {/* Logo */}
      <Text style={styles.logo}>QUIZDES</Text>

      {/* Quiz name */}
      <View style={styles.quizCard}>
        <Text style={styles.quizLabel}>PLAYING</Text>
        <Text style={styles.quizTitle} numberOfLines={2}>{quizTitle}</Text>
      </View>

      {/* Relay badge */}
      {isRelay && (
        <View style={styles.relayBadge}>
          <Feather name="flag" size={14} color={C.white} />
          <Text style={styles.relayText}>RELAY RACE MODE</Text>
        </View>
      )}

      {/* Waiting animation */}
      <View style={styles.waitingBox}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.innerCircle} />
        </Animated.View>
        <Text style={styles.waitingTitle}>Waiting for host...</Text>
        <Text style={styles.waitingSubtitle}>The game will start automatically</Text>
      </View>

      {/* Your card */}
      <View style={styles.yourCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{(nickname || "?")[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.youLabel}>You're in!</Text>
          <Text style={styles.yourNickname}>{nickname}</Text>
        </View>
      </View>

      {/* Player count */}
      {participants && participants.length > 0 && (
        <View style={styles.playerCount}>
          <Feather name="users" size={16} color={C.whiteMid} />
          <Text style={styles.playerCountText}>{participants.length} player{participants.length !== 1 ? "s" : ""} ready</Text>
        </View>
      )}

      {/* Leave button */}
      <Pressable style={({ pressed }) => [styles.leaveBtn, pressed && { opacity: 0.6 }]} onPress={() => router.back()}>
        <Text style={styles.leaveBtnText}>Leave</Text>
      </Pressable>
    </View>
  );
}

function useParticipants(gameId: number) {
  const [data, setData] = React.useState<{ id: number; nickname: string }[] | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const fn = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/games/${gameId}/participants`);
        if (res.ok) setData(await res.json());
      } catch {}
    };
    fn();
    const t = setInterval(fn, 3000);
    return () => clearInterval(t);
  }, [gameId]);

  return { data };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.yellow, letterSpacing: 3 },
  quizCard: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 28, paddingVertical: 20, alignItems: "center", width: "100%",
  },
  quizLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.whiteMid, letterSpacing: 2, marginBottom: 6 },
  quizTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.white, textAlign: "center" },
  relayBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#059669", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  relayText: { fontFamily: "Inter_700Bold", fontSize: 12, color: C.white, letterSpacing: 1 },
  waitingBox: { alignItems: "center", gap: 16 },
  pulseCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,204,2,0.15)", alignItems: "center", justifyContent: "center",
  },
  innerCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.yellow },
  waitingTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.white },
  waitingSubtitle: { fontFamily: "Inter_400Regular", fontSize: 15, color: C.whiteMid, textAlign: "center" },
  yourCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: C.surfaceBright, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16,
    width: "100%",
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.purple, alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.yellow },
  youLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteMid },
  yourNickname: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white },
  playerCount: { flexDirection: "row", alignItems: "center", gap: 8 },
  playerCountText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.whiteMid },
  leaveBtn: { paddingVertical: 12, paddingHorizontal: 36, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  leaveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.whiteMid },
});
