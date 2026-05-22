import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";

// Always use quizdes.com as the API backend.
// In production, the mobile bundle is served from quizdes.com so this is same-origin.
// In the Replit dev preview the Expo domain is different from the API domain,
// so we hardcode quizdes.com here instead of using window.location.origin.
const apiBase = "https://quizdes.com";

setBaseUrl(apiBase);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lobby/[id]" />
      <Stack.Screen name="play/[id]" />
      <Stack.Screen name="results/[id]" />
      <Stack.Screen name="practice/[id]" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="quizzes/index" />
      <Stack.Screen name="quizzes/[id]" />
      <Stack.Screen name="quiz-edit/[id]" />
      <Stack.Screen name="host/[token]" />
      <Stack.Screen name="ai-generate" />
      <Stack.Screen name="language" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
