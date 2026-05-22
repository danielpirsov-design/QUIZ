import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Image, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function useUpdateProfile() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const update = async (data: { displayName?: string; avatarUrl?: string | null }) => {
    setLoading(true);
    try {
      const base = "https://quizdes.com";
      const res = await fetch(`${base}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading };
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 16) : insets.top;
  const { user } = useAuth();
  const { update, loading } = useUpdateProfile();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState((user as any)?.avatarUrl ?? "");
  const [avatarErr, setAvatarErr] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await update({ displayName: displayName || undefined, avatarUrl: avatarUrl || null });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={[styles.root]}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Feather name="arrow-left" size={22} color={C.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUrl && !avatarErr ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImg}
                onError={() => setAvatarErr(true)}
                onLoad={() => setAvatarErr(false)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(displayName || user?.displayName || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.avatarHint}>Tap fields below to update your profile</Text>
        </View>

        {/* Profile section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="user" size={16} color={C.yellow} />
            <Text style={styles.sectionTitle}>Profile</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={C.whiteLow}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>AVATAR URL</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={(t) => { setAvatarUrl(t); setAvatarErr(false); }}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={C.whiteLow}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Read-only info */}
          <View style={styles.infoRow}>
            <View style={styles.infoField}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{user?.email ?? ""}</Text>
            </View>
            <View style={styles.infoField}>
              <Text style={styles.infoLabel}>ROLE</Text>
              <Text style={styles.infoValue}>{user?.role ?? ""}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#111" size="small" />
            ) : (
              <>
                <Feather name={saved ? "check" : "save"} size={16} color="#111" />
                <Text style={styles.saveBtnText}>{saved ? "Saved!" : "Save Profile"}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="shield" size={16} color={C.yellow} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <Text style={styles.accountNote}>
            Manage subscription, change email, or delete your account on the web app at quizdes.com.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.white },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, overflow: "hidden", borderWidth: 3, borderColor: C.yellow, marginBottom: 10 },
  avatarImg: { width: 88, height: 88 },
  avatarFallback: { width: 88, height: 88, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: "Inter_700Bold", fontSize: 32, color: C.white },
  avatarHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.whiteLow },
  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.white },
  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: C.whiteLow, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, color: C.white,
    fontFamily: "Inter_400Regular", fontSize: 15,
  },
  infoRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  infoField: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  infoLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: C.whiteLow, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.whiteMid },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.yellow, borderRadius: 14, height: 50,
  },
  saveBtnSuccess: { backgroundColor: "#22c55e" },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#111" },
  accountNote: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.whiteLow, lineHeight: 20 },
});
