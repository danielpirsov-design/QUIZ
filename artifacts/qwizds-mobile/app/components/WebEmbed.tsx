import React from "react";
import { Platform, View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import C from "@/constants/colors";

interface WebEmbedProps {
  path: string;
  title?: string;
}

export default function WebEmbed({ path, title }: WebEmbedProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 0) : insets.top;

  const url = `https://quizdes.com${path}`;

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Feather name="arrow-left" size={22} color={C.white} />
          </Pressable>
          {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.nativeMsg}>
          <Feather name="globe" size={40} color={C.whiteLow} />
          <Text style={styles.nativeMsgText}>Open {url} in a browser to access this feature.</Text>
        </View>
      </View>
    );
  }

  const headerHeight = 52 + topPad;

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: C.purpleDeep,
        overflow: "hidden",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: `${topPad + 10}px 16px 10px`,
          backgroundColor: C.purpleDeep,
          borderBottom: `1px solid ${C.border}`,
          minHeight: headerHeight,
          boxSizing: "border-box",
        },
      },
      React.createElement(
        "button",
        {
          onClick: () => router.back(),
          style: {
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: C.white,
            display: "flex",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 20, lineHeight: 1, color: C.white } },
          "←"
        )
      ),
      title
        ? React.createElement(
            "span",
            {
              style: {
                color: C.white,
                fontFamily: "Inter_600SemiBold, sans-serif",
                fontSize: 16,
                flex: 1,
              },
            },
            title
          )
        : null
    ),
    React.createElement("iframe", {
      src: url,
      style: {
        flex: 1,
        border: "none",
        width: "100%",
        height: `calc(100% - ${headerHeight}px)`,
        display: "block",
      },
      title: title || "QUIZDES",
      allow: "autoplay; microphone",
    })
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.white, flex: 1, marginLeft: 8 },
  nativeMsg: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  nativeMsgText: { color: C.whiteLow, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
});
