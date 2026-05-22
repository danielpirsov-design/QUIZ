import React from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetGameResults } from "@workspace/api-client-react";
import C from "@/constants/colors";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function ResultsScreen() {
  const { id, participantId, nickname } = useLocalSearchParams<{ id: string; participantId: string; nickname: string }>();
  const gameId = parseInt(id || "0");
  const pId = parseInt(participantId || "0");
  const insets = useSafeAreaInsets();

  const { data: results, isLoading, error } = useGetGameResults(gameId, {
    query: { enabled: !!gameId, queryKey: [`/api/games/${gameId}/results`] },
  });

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 20) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 20) : insets.bottom;

  const participants = (results as any)?.participants ?? [];
  const myResult = participants.find((p: any) => p.id === pId);
  const myRank = myResult ? participants.indexOf(myResult) + 1 : null;
  const top3 = participants.slice(0, 3);
  const rest = participants.slice(3);

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.yellow} />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>QUIZDES</Text>
        <Text style={styles.gameOver}>Game Over!</Text>
      </View>

      {/* My result pill */}
      {myResult && (
        <View style={[styles.myPill, myRank === 1 && styles.myPillWinner]}>
          <View style={styles.myPillLeft}>
            <View style={styles.myRankCircle}>
              <Text style={styles.myRankText}>{myRank && myRank <= 3 ? MEDALS[myRank - 1] : `#${myRank}`}</Text>
            </View>
            <View>
              <Text style={styles.myName}>{myResult.nickname}</Text>
              <Text style={styles.myLabel}>Your result</Text>
            </View>
          </View>
          <View style={styles.myScoreBox}>
            <Text style={styles.myScore}>{myResult.score?.toLocaleString()}</Text>
            <Text style={styles.myScoreLabel}>pts</Text>
          </View>
        </View>
      )}

      {/* Podium (top 3) */}
      {top3.length > 0 && (
        <View style={styles.podiumRow}>
          {[1, 0, 2].map(i => {
            const p = top3[i];
            if (!p) return <View key={i} style={{ flex: 1 }} />;
            const rank = i + 1;
            const heights = [60, 90, 44];
            return (
              <View key={i} style={[styles.podiumCol, i === 0 && styles.podiumCenter]}>
                <Text style={styles.podiumNickname} numberOfLines={1}>{p.nickname}</Text>
                <Text style={styles.podiumScore}>{p.score?.toLocaleString()}</Text>
                <Text style={styles.podiumMedal}>{MEDALS[i]}</Text>
                <View style={[styles.podiumBar, { height: heights[i] ?? 44, backgroundColor: PODIUM_COLORS[i] + "33", borderColor: PODIUM_COLORS[i] }]}>
                  <Text style={[styles.podiumRank, { color: PODIUM_COLORS[i] }]}>#{rank}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <FlatList
          data={rest}
          keyExtractor={(p: any) => String(p.id)}
          style={styles.restList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: p, index }: { item: any; index: number }) => {
            const rank = index + 4;
            const isMe = p.id === pId;
            return (
              <View style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
                <Text style={styles.leaderRank}>#{rank}</Text>
                <View style={[styles.leaderAvatar, { backgroundColor: isMe ? C.yellow : C.surface }]}>
                  <Text style={[styles.leaderAvatarLetter, { color: isMe ? C.purpleDeep : C.white }]}>
                    {p.nickname?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <Text style={[styles.leaderNickname, isMe && styles.leaderNicknameMe]} numberOfLines={1}>{p.nickname}</Text>
                <Text style={styles.leaderScore}>{p.score?.toLocaleString()}</Text>
              </View>
            );
          }}
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace("/")}
        >
          <Feather name="home" size={18} color={C.purpleDeep} />
          <Text style={styles.homeBtnText}>Play Again</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.discoverBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace("/discover")}
        >
          <Feather name="search" size={18} color={C.white} />
          <Text style={styles.discoverBtnText}>Discover</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.whiteMid },
  header: { alignItems: "center", paddingVertical: 16 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.yellow, letterSpacing: 3 },
  gameOver: { fontFamily: "Inter_700Bold", fontSize: 30, color: C.white, marginTop: 4 },
  myPill: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  myPillWinner: { backgroundColor: C.yellowDim, borderColor: C.yellow },
  myPillLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  myRankCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceBright, alignItems: "center", justifyContent: "center" },
  myRankText: { fontSize: 22 },
  myName: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.white },
  myLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteMid },
  myScoreBox: { alignItems: "flex-end" },
  myScore: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.yellow },
  myScoreLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteMid },
  podiumRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  podiumCol: { flex: 1, alignItems: "center", gap: 4 },
  podiumCenter: { marginBottom: 0 },
  podiumNickname: { fontFamily: "Inter_700Bold", fontSize: 12, color: C.white, width: "100%", textAlign: "center" },
  podiumScore: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.whiteMid },
  podiumMedal: { fontSize: 24 },
  podiumBar: {
    width: "100%", borderRadius: 10, borderWidth: 1.5, borderTopWidth: 3,
    alignItems: "center", justifyContent: "flex-end", paddingBottom: 6,
  },
  podiumRank: { fontFamily: "Inter_700Bold", fontSize: 14 },
  restList: { flex: 1, paddingHorizontal: 20 },
  leaderRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  leaderRowMe: { backgroundColor: C.yellowDim, borderRadius: 12, paddingHorizontal: 10, borderBottomWidth: 0, marginBottom: 2 },
  leaderRank: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.whiteMid, width: 28 },
  leaderAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  leaderAvatarLetter: { fontFamily: "Inter_700Bold", fontSize: 16 },
  leaderNickname: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.white },
  leaderNicknameMe: { color: C.yellow },
  leaderScore: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.whiteMid },
  actions: { flexDirection: "row", gap: 12, padding: 20 },
  homeBtn: {
    flex: 1, backgroundColor: C.yellow, borderRadius: 16,
    paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  homeBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.purpleDeep },
  discoverBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  discoverBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white },
});
