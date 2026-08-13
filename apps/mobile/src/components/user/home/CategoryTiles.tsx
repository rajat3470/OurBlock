import { memo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { categoryEmoji } from "@hooks/useHomeScreen";

interface CategoryTilesProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const CategoryTiles = memo(function CategoryTiles({
  categories,
  selectedCategory,
  setSelectedCategory,
}: CategoryTilesProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.catTilesRow}
    >
      {categories
        .filter((category) => category !== "all")
        .map((category) => {
          const active = category === selectedCategory;
          return (
            <TouchableOpacity
              key={category}
              style={styles.catTile}
              activeOpacity={0.85}
              onPress={() => setSelectedCategory(active ? "all" : category)}
            >
              <View style={[styles.catIconBox, active ? styles.catIconBoxActive : null]}>
                <Text style={styles.catIconEmoji}>{categoryEmoji(category)}</Text>
              </View>
              <Text
                style={[styles.catTileLabel, active ? styles.catTileLabelActive : null]}
                numberOfLines={1}
              >
                {category}
              </Text>
              <View style={[styles.catUnderline, active ? styles.catUnderlineActive : null]} />
            </TouchableOpacity>
          );
        })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  catTilesRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 14 },
  catTile: { alignItems: "center", width: 64 },
  catIconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  catIconBoxActive: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  catIconEmoji: { fontSize: 28 },
  catTileLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "capitalize",
  },
  catTileLabelActive: { color: "#B45309" },
  catUnderline: {
    marginTop: 4,
    height: 3,
    width: 20,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  catUnderlineActive: { backgroundColor: "#F59E0B" },
});
