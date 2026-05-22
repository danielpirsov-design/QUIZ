import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Email and password are required"); return; }
    if (mode === "register" && (!username || !displayName)) {
      setError("All fields are required"); return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const err = mode === "login"
      ? await login(email.trim(), password)
      : await register(email.trim(), username.trim(), displayName.trim(), password);
    setLoading(false);
    if (err) { setError(err); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={C.white} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Feather name="zap" size={28} color={C.yellow} />
          </View>
          <Text style={styles.logoText}>QUIZDES</Text>
        </View>

        <Text style={styles.title}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "login" ? "Sign in to access your quizzes and stats" : "Join QUIZDES for free"}
        </Text>

        {/* Fields */}
        <View style={styles.form}>
          {mode === "register" && (
            <>
              <View style={styles.field}>
                <Feather name="user" size={16} color={C.whiteLow} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display name"
                  placeholderTextColor={C.whiteLow}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Feather name="at-sign" size={16} color={C.whiteLow} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={C.whiteLow}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </>
          )}
          <View style={styles.field}>
            <Feather name="mail" size={16} color={C.whiteLow} style={styles.fieldIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={C.whiteLow}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>
          <View style={styles.field}>
            <Feather name="lock" size={16} color={C.whiteLow} style={styles.fieldIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={C.whiteLow}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              textContentType="password"
            />
            <Pressable onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Feather name={showPass ? "eye-off" : "eye"} size={16} color={C.whiteLow} />
            </Pressable>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#111" />
            : <Text style={styles.submitText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
          }
        </Pressable>

        <Pressable onPress={() => { setMode(m => m === "login" ? "register" : "login"); setError(""); }} style={styles.switchRow}>
          <Text style={styles.switchText}>
            {mode === "login" ? "No account? " : "Already have an account? "}
            <Text style={styles.switchLink}>{mode === "login" ? "Sign up" : "Sign in"}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  content: { paddingHorizontal: 24 },
  back: { marginBottom: 32, alignSelf: "flex-start", padding: 4 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logoBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.white, letterSpacing: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.white, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.whiteLow, marginBottom: 32 },
  form: { gap: 12, marginBottom: 20 },
  field: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, color: C.white, fontFamily: "Inter_400Regular", fontSize: 15 },
  eyeBtn: { padding: 4 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  errorText: { color: "#f87171", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  submitBtn: {
    height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: C.yellow, marginBottom: 20,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111" },
  switchRow: { alignItems: "center" },
  switchText: { fontFamily: "Inter_400Regular", color: C.whiteLow, fontSize: 14 },
  switchLink: { color: C.yellow, fontFamily: "Inter_600SemiBold" },
});
