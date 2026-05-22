import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListQuizzes } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import C from "@/constants/colors";

const CARD_COLORS = [
  ["#7c3aed", "#a855f7"],
  ["#db2777", "#ec4899"],
  ["#0891b2", "#06b6d4"],
  ["#d97706", "#fbbf24"],
  ["#059669", "#34d399"],
  ["#e53935", "#f97316"],
];

export default function MyQuizzesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const { data: quizzes, isLoading, refetch } = useListQuizzes();

  const filtered = (quizzes || []).filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase())
  );

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 16) : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <Text style={styles.title}>My Quizzes</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={C.whiteLow} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your quizzes..."
          placeholderTextColor={C.whiteLow}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={C.whiteLow} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.yellow} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="book-open" size={48} color={C.whiteLow} />
          <Text style={styles.emptyText}>
            {search ? "No quizzes match your search" : "You haven't created any quizzes yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={q => String(q.id)}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item, index }) => {
            const [c1, c2] = CARD_COLORS[index % CARD_COLORS.length];
            const qCount = (item as any).questionCount ?? 0;
            return (
              <Pressable
                style={styles.card}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/quizzes/${item.id}` as any);
                }}
              >
                {/* Colored accent strip */}
                <View style={[styles.cardAccent, { backgroundColor: c1 }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={[styles.visBadge, { backgroundColor: item.visibility === "public" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)" }]}>
                      <Feather name={item.visibility === "public" ? "globe" : "lock"} size={10} color={item.visibility === "public" ? C.green : C.whiteLow} />
                      <Text style={[styles.visBadgeText, { color: item.visibility === "public" ? C.green : C.whiteLow }]}>
                        {item.visibility === "public" ? "Public" : "Private"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <Feather name="help-circle" size={13} color={C.whiteLow} />
                    <Text style={styles.metaText}>{qCount} question{qCount !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={C.whiteLow} style={{ alignSelf: "center", marginRight: 8 }} />
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  back: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.white },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface, borderRadius: 14, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.white, fontFamily: "Inter_400Regular", fontSize: 14 },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  card: {
    flexDirection: "row", backgroundColor: C.surface,
    borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden",
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.white, flex: 1 },
  visBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  visBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.whiteLow },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyText: { fontFamily: "Inter_400Regular", color: C.whiteLow, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
