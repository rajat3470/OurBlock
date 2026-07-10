import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "@/types";
import { getFirstImage } from "@hooks/useHomeScreen";
import content from "@/content/home.json";

interface DishListProps {
  dishes: Product[];
  businessNameById: Map<string, string>;
  onPressDish: (dish: Product) => void;
}

export function DishList({ dishes, businessNameById, onPressDish }: DishListProps) {
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{content.sections.dishes}</Text>
        <Text style={styles.resultCountText}>
          {dishes.length}
          {content.sections.foundSuffix}
        </Text>
      </View>
      <View style={styles.dishList}>
        {dishes.map((dish) => {
          const dishImg = getFirstImage(dish.imageUrls?.[0]);
          const storeName = businessNameById.get(dish.businessId) ?? content.dish.defaultStore;
          return (
            <TouchableOpacity
              key={dish.id}
              style={styles.dishCard}
              activeOpacity={0.85}
              onPress={() => onPressDish(dish)}
            >
              <View style={styles.dishImageWrap}>
                {dishImg ? (
                  <Image source={{ uri: dishImg }} style={styles.dishImage} contentFit="cover" />
                ) : (
                  <View style={styles.dishImageFallback}>
                    <Text style={styles.dishFallbackEmoji}>{content.dish.fallbackEmoji}</Text>
                  </View>
                )}
              </View>
              <View style={styles.dishInfo}>
                <View style={styles.dishNameRow}>
                  {dish.isVeg !== undefined ? (
                    <View
                      style={[
                        styles.dietMark,
                        { borderColor: dish.isVeg ? "#16A34A" : "#DC2626" },
                      ]}
                    >
                      <View
                        style={[
                          styles.dietDot,
                          { backgroundColor: dish.isVeg ? "#16A34A" : "#DC2626" },
                        ]}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.dishName} numberOfLines={1}>
                    {dish.name}
                  </Text>
                </View>
                <Text style={styles.dishStore} numberOfLines={1}>
                  {content.dish.fromPrefix}
                  {storeName}
                </Text>
                <Text style={styles.dishPrice}>
                  {content.currency} {dish.price}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, color: "#0F172A", fontWeight: "800" },
  resultCountText: { fontSize: 12.5, fontWeight: "700", color: "#9CA3AF" },
  dishList: { paddingHorizontal: 16, gap: 10 },
  dishCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dishImageWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  dishImage: { width: "100%", height: "100%" },
  dishImageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  dishFallbackEmoji: { fontSize: 26 },
  dishInfo: { flex: 1 },
  dishNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dietMark: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dietDot: { width: 6, height: 6, borderRadius: 3 },
  dishName: { flex: 1, fontSize: 14.5, fontWeight: "700", color: "#111827" },
  dishStore: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  dishPrice: { fontSize: 13.5, fontWeight: "800", color: "#0E9F6E", marginTop: 3 },
});
