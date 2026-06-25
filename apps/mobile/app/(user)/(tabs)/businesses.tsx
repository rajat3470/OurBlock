import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useUserApp } from "../../../src/hooks/useUserApp";
import { Business } from "../../../src/types";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function getBusinessStatus(business: Business): "open" | "paused" | "closed" {
  if (business.status !== "active") return "closed";
  let withinHours = true;
  if (business.operatingHours) {
    const now = new Date();
    const dayKey = DAYS[now.getDay()];
    const hours = business.operatingHours[dayKey];
    if (!hours || hours.isClosed) {
      withinHours = false;
    } else {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      withinHours = currentTime >= hours.open && currentTime < hours.close;
    }
  }
  if (!withinHours) return "closed";
  if (business.isTakingOrders === false) return "paused";
  return "open";
}

export default function UserBusinesses() {
  const insets = useSafeAreaInsets();
  const { businesses, featuredProducts, favoriteBusinessIds, toggleFavorite } = useUserApp();
  const [searchQuery, setSearchQuery] = useState("");

  const productMatchesByBusiness = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const map = new Map<string, string[]>();
    if (!query) return map;

    featuredProducts.forEach((product) => {
      const searchable = [
        product.name,
        product.category,
        product.description ?? "",
        ...(product.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(query)) return;

      const existing = map.get(product.businessId) ?? [];
      if (!existing.includes(product.name)) {
        existing.push(product.name);
      }
      map.set(product.businessId, existing);
    });

    return map;
  }, [featuredProducts, searchQuery]);

  const filteredBusinesses = useMemo(
    () => {
      const query = searchQuery.trim().toLowerCase();
      return businesses
        .filter((item) => {
          if (!query) return true;
          const matchesStore =
            item.name.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.address.toLowerCase().includes(query);

          return matchesStore || productMatchesByBusiness.has(item.id);
        })
        .sort((a, b) => {
          if (!query) return Number(b.rating || 0) - Number(a.rating || 0);
          const aItemHits = productMatchesByBusiness.get(a.id)?.length ?? 0;
          const bItemHits = productMatchesByBusiness.get(b.id)?.length ?? 0;
          if (aItemHits !== bItemHits) return bItemHits - aItemHits;
          return Number(b.rating || 0) - Number(a.rating || 0);
        });
    },
    [businesses, productMatchesByBusiness, searchQuery]
  );

  const renderItem = ({ item }: { item: Business }) => {
    const isFavorite = favoriteBusinessIds.includes(item.id);
    const bizStatus = getBusinessStatus(item);
    const matchedItems = productMatchesByBusiness.get(item.id) ?? [];
    const matchedPreview = matchedItems.slice(0, 2).join(", ");
    const extraMatchedCount = Math.max(0, matchedItems.length - 2);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: "/(user)/business", params: { id: item.id } })}
        activeOpacity={0.85}
      >
        <View style={styles.cardLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="storefront-outline" size={22} color="#DC2626" />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {bizStatus === "open" && (
                <View style={styles.badgeOpen}><Text style={styles.badgeOpenText}>Open</Text></View>
              )}
              {bizStatus === "paused" && (
                <View style={styles.badgePaused}><Text style={styles.badgePausedText}>Paused</Text></View>
              )}
              {bizStatus === "closed" && (
                <View style={styles.badgeClosed}><Text style={styles.badgeClosedText}>Closed</Text></View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{item.category}</Text>
              {item.estimatedDeliveryTime && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaDelivery}>~{item.estimatedDeliveryTime}</Text>
                </>
              )}
            </View>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
            {searchQuery.trim().length > 0 && matchedItems.length > 0 ? (
              <Text style={styles.matchedItemsText} numberOfLines={1}>
                Items: {matchedPreview}{extraMatchedCount > 0 ? ` +${extraMatchedCount} more` : ""}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.favoriteBtn, isFavorite ? styles.favoriteBtnActive : null]}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? "#FFFFFF" : "#DC2626"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#DC2626", "#991B1B"]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Shops</Text>
        <Text style={styles.headerSub}>{businesses.length} stores in your society</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search stores or items..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredBusinesses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="storefront-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.emptyTitle}>No shops found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#F7F8FA",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  badgeOpen: {
    backgroundColor: "#D1FAE5",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeOpenText: { fontSize: 11, fontWeight: "700", color: "#065F46" },
  badgePaused: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgePausedText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
  badgeClosed: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeClosedText: { fontSize: 11, fontWeight: "700", color: "#991B1B" },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
    flexWrap: "wrap",
  },
  metaDot: { fontSize: 12, color: "#9CA3AF" },
  metaDelivery: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  address: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  matchedItemsText: {
    marginTop: 4,
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "600",
  },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    marginLeft: 8,
  },
  favoriteBtnActive: {
    backgroundColor: "#DC2626",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
