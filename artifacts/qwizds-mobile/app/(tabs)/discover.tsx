import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, FlatList,
  Pressable, ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDiscoverQuizzes } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const GRADIENTS = [
  ["#7c3aed","#a855f7"], ["#db2777","#ec4899"], ["#0891b2","#06b6d4"],
  ["#d97706","#fbbf24"], ["#059669","#34d399"], ["#e53935","#f97316"],
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const { data: quizzes, isLoading } = useDiscoverQuizzes({ search });

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>QUIZDES</Text>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={C.whiteLow} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quizzes..."
            placeholderTextColor={C.whiteLow}
            value={input}
            onChangeText={setInput}
            returnKeyType="search"
          />
          {input.length > 0 && (
            <Pressable onPress={() => { setInput(""); setSearch(""); }}>
              <Feather name="x" size={18} color={C.whiteLow} />
            </Pressable>
          )}
        </View>
        {search && !isLoading && (
          <Text style={styles.resultCount}>
            {quizzes?.length ?? 0} result{quizzes?.length !== 1 ? "s" : ""} for "{search}"
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.yellow} />
        </View>
      ) : quizzes?.length === 0 ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={C.whiteLow} />
          <Text style={styles.emptyText}>No quizzes found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={quizzes}
          keyExtractor={q => String(q.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!quizzes?.length}
          renderItem={({ item: quiz, index }) => {
            const [fromC, toC] = GRADIENTS[index % GRADIENTS.length];
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
                onPress={() => router.push({ pathname: "/practice/[id]", params: { id: String(quiz.id) } })}
              >
                {/* Color bar */}
                <View style={[styles.cardBar, { backgroundColor: fromC }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{quiz.title}</Text>
                      <Text style={styles.cardBy}>By {quiz.creatorName}</Text>
                      {quiz.description ? (
                        <Text style={styles.cardDesc} numberOfLines={2}>{quiz.description}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.qBadge, { backgroundColor: fromC + "33" }]}>
                      <Text style={[styles.qBadgeText, { color: fromC }]}>{quiz.questionCount}Q</Text>
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <View style={styles.plays}>
                      <Feather name="users" size={13} color={C.whiteLow} />
                      <Text style={styles.playsText}>{quiz.timesPlayed} plays</Text>
                    </View>
                    <Pressable
                      style={[styles.practiceBtn, { backgroundColor: fromC }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push({ pathname: "/practice/[id]", params: { id: String(quiz.id) } });
                      }}
                    >
                      <Feather name="zap" size={14} color={C.white} />
                      <Text style={styles.practiceBtnText}>Practice</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purpleDeep },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.yellow, letterSpacing: 2, marginBottom: 16 },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16, color: C.white },
  resultCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteMid, marginTop: 8, marginLeft: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.whiteMid },
  emptySubtext: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.whiteLow },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    overflow: "hidden", flexDirection: "row",
  },
  cardBar: { width: 5 },
  cardContent: { flex: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.white, marginBottom: 3 },
  cardBy: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.whiteMid },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.whiteLow, marginTop: 4 },
  qBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  qBadgeText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  plays: { flexDirection: "row", alignItems: "center", gap: 5 },
  playsText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.whiteLow },
  practiceBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  practiceBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: C.white },
});
