import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetLeaderboard } from "@workspace/api-client-react";
import C from "@/constants/colors";

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#fbbf24", "#94a3b8", "#d97706"];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 16) : insets.top;
  const { data: leaders, isLoading } = useGetLeaderboard({ limit: 50 });

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.hero}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.heroTitle}>Global Rankings</Text>
          <Text style={styles.heroSub}>Top players by total points earned</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={C.yellow} size="large" style={{ marginTop: 40 }} />
        ) : (
          leaders?.map((entry: any, i: number) => {
            const isTop3 = i < 3;
            return (
              <View key={entry.userId} style={[styles.row, isTop3 && styles.rowTop]}>
                <View style={styles.rankCol}>
                  {isTop3 ? (
                    <Text style={styles.medal}>{MEDALS[i]}</Text>
                  ) : (
                    <Text style={styles.rankNum}>#{i + 1}</Text>
                  )}
                </View>

                <View style={[styles.avatar, isTop3 && { borderColor: MEDAL_COLORS[i], borderWidth: 2 }]}>
                  {entry.avatarUrl ? (
                    <Image source={{ uri: entry.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: C.purple }]}>
                      <Text style={styles.avatarInitial}>
                        {(entry.displayName || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.nameCol}>
                  <Text style={styles.displayName} numberOfLines={1}>{entry.displayName}</Text>
                  <Text style={styles.username} numberOfLines={1}>@{entry.username}</Text>
                </View>

                <View style={styles.pointsCol}>
                  <Text style={[styles.points, { color: isTop3 ? MEDAL_COLORS[i] : C.purple }]}>
                    {entry.totalPoints.toLocaleString()}
                  </Text>
                  <Text style={styles.ptLabel}>pts</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.white },
  list: { paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 },
  trophy: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.white, marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.whiteLow, textAlign: "center" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowTop: { backgroundColor: "rgba(255,255,255,0.03)" },
  rankCol: { width: 36, alignItems: "center" },
  medal: { fontSize: 22 },
  rankNum: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.whiteLow },
  avatar: { width: 42, height: 42, borderRadius: 12, overflow: "hidden" },
  avatarImg: { width: 42, height: 42 },
  avatarFallback: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white },
  nameCol: { flex: 1, minWidth: 0 },
  displayName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.white },
  username: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteLow, marginTop: 1 },
  pointsCol: { alignItems: "flex-end" },
  points: { fontFamily: "Inter_700Bold", fontSize: 18 },
  ptLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: C.whiteLow, textTransform: "uppercase", letterSpacing: 1 },
});
