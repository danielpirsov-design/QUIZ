import React from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetDashboardStats } from "@workspace/api-client-react";
import C from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon, label, sublabel, onPress, danger, accent,
}: {
  icon: string; label: string; sublabel?: string;
  onPress: () => void; danger?: boolean; accent?: string;
}) {
  const ic = danger ? "#f87171" : accent ?? C.yellow;
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? "rgba(239,68,68,0.15)" : `${ic}18` }]}>
        <Feather name={icon as any} size={18} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: "#f87171" }]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      {!danger && <Feather name="chevron-right" size={16} color={C.whiteLow} />}
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading, logout } = useAuth();
  const { data: stats } = useGetDashboardStats();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.yellow} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <ScrollView contentContainerStyle={styles.guestContent}>
          <View style={styles.guestHero}>
            <View style={styles.avatarCircle}>
              <Feather name="user" size={40} color={C.whiteLow} />
            </View>
            <Text style={styles.guestTitle}>You're not signed in</Text>
            <Text style={styles.guestSub}>Sign in to track your stats, manage your quizzes, and earn coins.</Text>
          </View>
          <Pressable style={styles.signInBtn} onPress={() => router.push("/auth" as any)}>
            <Feather name="log-in" size={18} color="#111" />
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
          <Pressable style={styles.registerBtn} onPress={() => router.push("/auth" as any)}>
            <Text style={styles.registerText}>Create a free account</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const initials = user.displayName.slice(0, 2).toUpperCase();
  const level = user.xp ? Math.floor(user.xp / 500) + 1 : 1;

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
  };

  return (
    <ScrollView
      style={[styles.root]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad }}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.usernameText}>@{user.username}</Text>
        <View style={styles.levelBadge}>
          <Feather name="star" size={12} color={C.yellow} />
          <Text style={styles.levelText}>Level {level}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Points" value={(stats as any)?.totalPointsEarned?.toLocaleString() ?? user.totalPoints.toLocaleString()} color={C.yellow} />
        <StatCard label="Coins" value={`🪙 ${user.coins}`} />
        <StatCard label="Quizzes" value={(stats as any)?.totalQuizzes ?? user.quizzesCreated} />
        <StatCard label="Games" value={(stats as any)?.totalGamesHosted ?? user.gamesPlayed} />
      </View>

      <View style={styles.divider} />

      {/* Play */}
      <SectionLabel label="Play" />
      <View style={styles.menuSection}>
        <MenuRow
          icon="zap"
          label="Join a Game"
          sublabel="Enter a PIN to play"
          onPress={() => router.push("/" as any)}
          accent={C.yellow}
        />
        <MenuRow
          icon="compass"
          label="Discover Quizzes"
          sublabel="Browse public quizzes"
          onPress={() => router.push("/(tabs)/discover" as any)}
          accent="#06b6d4"
        />
        <MenuRow
          icon="award"
          label="Leaderboard"
          sublabel="Global rankings"
          onPress={() => router.push("/leaderboard" as any)}
          accent="#fbbf24"
        />
      </View>

      <View style={styles.divider} />

      {/* Create */}
      <SectionLabel label="Create" />
      <View style={styles.menuSection}>
        <MenuRow
          icon="cpu"
          label="AI Quiz Generator"
          sublabel="Generate a quiz in seconds"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/ai-generate" as any);
          }}
          accent="#ec4899"
        />
        <MenuRow
          icon="book-open"
          label="My Quizzes"
          sublabel={`${user.quizzesCreated} quiz${user.quizzesCreated !== 1 ? "zes" : ""}`}
          onPress={() => router.push("/quizzes" as any)}
          accent="#a855f7"
        />
        <MenuRow
          icon="globe"
          label="Language Learning"
          sublabel="Flashcards & vocabulary games"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/language" as any);
          }}
          accent="#22c55e"
        />
      </View>

      {user.role === "teacher" && (
        <>
          <View style={styles.divider} />
          <SectionLabel label="Host" />
          <View style={styles.menuSection}>
            <MenuRow
              icon="play-circle"
              label="Host a Game"
              sublabel="Start a live game from your quizzes"
              onPress={() => router.push("/quizzes" as any)}
              accent="#f97316"
            />
          </View>
        </>
      )}

      <View style={styles.divider} />

      {/* Account */}
      <SectionLabel label="Account" />
      <View style={styles.menuSection}>
        <MenuRow
          icon="settings"
          label="Settings"
          sublabel="Profile, name, avatar"
          onPress={() => router.push("/settings" as any)}
          accent={C.whiteMid}
        />
        <MenuRow
          icon="log-out"
          label="Sign Out"
          onPress={handleLogout}
          danger
        />
      </View>

      <Text style={styles.versionText}>QUIZDES • {user.role}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  guestContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  guestHero: { alignItems: "center", marginBottom: 40 },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center", marginBottom: 20,
    borderWidth: 2, borderColor: C.border,
  },
  guestTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.white, marginBottom: 10, textAlign: "center" },
  guestSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.whiteLow, textAlign: "center", lineHeight: 20 },
  signInBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.yellow, borderRadius: 16, height: 56,
    paddingHorizontal: 40, marginBottom: 12, width: "100%",
  },
  signInText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111" },
  registerBtn: { padding: 12 },
  registerText: { fontFamily: "Inter_600SemiBold", color: C.yellow, fontSize: 14 },
  profileHeader: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 20 },
  avatarBig: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.purple, alignItems: "center", justifyContent: "center",
    marginBottom: 12, borderWidth: 3, borderColor: C.yellow,
  },
  avatarInitials: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.white },
  displayName: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.white, marginBottom: 4 },
  usernameText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.whiteLow, marginBottom: 10 },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,204,2,0.15)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(255,204,2,0.3)",
  },
  levelText: { fontFamily: "Inter_600SemiBold", color: C.yellow, fontSize: 12 },
  statsRow: { flexDirection: "row", marginHorizontal: 16, gap: 8, marginBottom: 8, flexWrap: "wrap" },
  statCard: {
    flex: 1, minWidth: "44%", backgroundColor: C.surface, borderRadius: 16,
    padding: 12, alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white, marginBottom: 3 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.whiteLow, textAlign: "center" },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8, marginHorizontal: 16 },
  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 11, color: C.whiteLow,
    textTransform: "uppercase", letterSpacing: 1.2,
    paddingHorizontal: 20, paddingBottom: 6, paddingTop: 4,
  },
  menuSection: { paddingHorizontal: 16, gap: 6, marginBottom: 4 },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  menuLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.white },
  menuSublabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteLow, marginTop: 1 },
  versionText: { textAlign: "center", color: C.whiteLow, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 24 },
});
