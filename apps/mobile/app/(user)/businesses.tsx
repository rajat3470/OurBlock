import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useUserApp } from "../../src/hooks/useUserApp";
import { Business } from "../../src/types";

export default function UserBusinesses() {
  const { businesses, favoriteBusinessIds, toggleFavorite } = useUserApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBusinesses = useMemo(
    () =>
      businesses.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [businesses, searchQuery]
  );

  const renderItem = ({ item }: { item: Business }) => {
    const isFavorite = favoriteBusinessIds.includes(item.id);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.category}</Text>
            <Text style={styles.meta}>{item.address}</Text>
          </View>
          <TouchableOpacity
            style={[styles.favoriteBtn, isFavorite ? styles.favoriteBtnActive : null]}
            onPress={() => toggleFavorite(item.id)}
          >
            <Text style={styles.favoriteText}>{isFavorite ? "♥" : "♡"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader title="Shops" subtitle="Explore businesses in your society" />

      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search shops"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredBusinesses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No businesses found</Text>
            <Text style={styles.emptySubtitle}>
              Try selecting another society or search term.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardLeft: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
    textTransform: "capitalize",
  },
  favoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  favoriteBtnActive: {
    backgroundColor: "#FEE2E2",
  },
  favoriteText: {
    fontSize: 16,
    color: "#DC2626",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
});
