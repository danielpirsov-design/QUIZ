import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const BASE_URL = "https://quizdes.com";

const AVATARS = ["🦊", "🐺", "🦁", "🐯", "🐧", "🦄", "🐉", "🦋", "🐸", "🤖"];
const AVATAR_COLORS = ["#e21b3c","#1368ce","#d89e00","#26890c","#46178f","#e55934","#0891b2","#db2777","#059669","#7c3aed"];

export default function JoinScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"pin" | "name">("pin");
  const [pin, setPin] = useState("");
  const [gameId, setGameId] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(p => p + d);
    setError("");
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(p => p.slice(0, -1));
    setError("");
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) { setError("Enter the game PIN"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/games/join/${pin}`);
      if (!res.ok) { setError("Game not found — check your PIN"); setLoading(false); return; }
      const game = await res.json();
      setGameId(game.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("name");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError("Enter your nickname"); return; }
    if (!gameId) { setError("Game not found, go back and re-enter PIN"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/games/${gameId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname: nickname.trim(), avatar: AVATARS[avatarIdx] }),
      });
      if (!res.ok) { setError("Could not join — game may have started"); setLoading(false); return; }
      const data = await res.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/lobby/[id]", params: { id: String(gameId), participantId: String(data.id), nickname: nickname.trim() } });
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const KEYS = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>QUIZDES</Text>
        <Text style={styles.tagline}>Join a live game</Text>
      </View>

      {step === "pin" ? (
        <View style={styles.body}>
          {/* PIN dots */}
          <View style={styles.pinRow}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.pinDot, pin[i] ? styles.pinDotFilled : null]}>
                <Text style={styles.pinDigit}>{pin[i] ?? ""}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Keypad */}
          <View style={styles.keypad}>
            {KEYS.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((k, ki) => (
                  k === "" ? <View key={ki} style={styles.keyEmpty} /> :
                  k === "⌫" ? (
                    <Pressable key={ki} style={({ pressed }) => [styles.key, styles.keyDel, pressed && styles.keyPressed]} onPress={handleDelete}>
                      <Feather name="delete" size={22} color={C.whiteMid} />
                    </Pressable>
                  ) : (
                    <Pressable key={ki} style={({ pressed }) => [styles.key, pressed && styles.keyPressed]} onPress={() => handleDigit(k)}>
                      <Text style={styles.keyText}>{k}</Text>
                    </Pressable>
                  )
                ))}
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.enterBtn, (!pin || loading) && styles.enterBtnDisabled, pressed && styles.enterBtnPressed]}
            onPress={handlePinSubmit}
            disabled={loading || pin.length < 4}
          >
            {loading ? <ActivityIndicator color={C.purpleDeep} /> : <Text style={styles.enterBtnText}>Enter</Text>}
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.nameBody} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => { setStep("pin"); setError(""); }} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={C.whiteMid} />
              <Text style={styles.backText}>PIN: {pin}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>What's your name?</Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Your nickname..."
              placeholderTextColor={C.whiteLow}
              value={nickname}
              onChangeText={t => { setNickname(t); setError(""); }}
              maxLength={20}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />

            <Text style={styles.sectionTitle}>Pick an avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((av, i) => (
                <Pressable
                  key={i}
                  style={[styles.avatarCircle, { backgroundColor: AVATAR_COLORS[i] }, avatarIdx === i && styles.avatarSelected]}
                  onPress={() => { setAvatarIdx(i); Haptics.selectionAsync(); }}
                >
                  <Text style={styles.avatarEmoji}>{av}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.enterBtn, (!nickname.trim() || loading) && styles.enterBtnDisabled, pressed && styles.enterBtnPressed]}
              onPress={handleJoin}
              disabled={loading || !nickname.trim()}
            >
              {loading ? <ActivityIndicator color={C.purpleDeep} /> : <Text style={styles.enterBtnText}>Join Game</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 8 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.yellow, letterSpacing: 3 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.whiteMid, marginTop: 4 },
  body: { flex: 1, alignItems: "center", paddingTop: 32 },
  pinRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  pinDot: {
    width: 48, height: 60, borderRadius: 14, borderWidth: 2, borderColor: C.border,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
  },
  pinDotFilled: { borderColor: C.yellow, backgroundColor: C.yellowDim },
  pinDigit: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.white },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#ff6b6b", marginBottom: 12, textAlign: "center" },
  keypad: { gap: 12, marginTop: 8, width: "80%", maxWidth: 300 },
  keyRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  key: {
    flex: 1, aspectRatio: 1.4, backgroundColor: C.surfaceBright, borderRadius: 18,
    alignItems: "center", justifyContent: "center", maxHeight: 66,
  },
  keyDel: { backgroundColor: C.surface },
  keyEmpty: { flex: 1 },
  keyPressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
  keyText: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.white },
  enterBtn: {
    marginTop: 28, backgroundColor: C.yellow, borderRadius: 20,
    paddingVertical: 18, paddingHorizontal: 64, alignItems: "center",
  },
  enterBtnDisabled: { opacity: 0.4 },
  enterBtnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  enterBtnText: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.purpleDeep },
  nameBody: { padding: 28, paddingTop: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 32 },
  backText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.whiteMid },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white, marginBottom: 16 },
  nameInput: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 18,
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 32,
  },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center",
  },
  avatarSelected: { borderWidth: 3, borderColor: C.yellow },
  avatarEmoji: { fontSize: 28 },
});
