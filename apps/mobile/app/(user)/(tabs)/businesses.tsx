import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBusinessesScreen } from "@hooks/useBusinessesScreen";
import { router } from "expo-router";
import { Business } from "../../../src/types";
import content from "@/content/businesses.json";

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
  const {
    businesses,
    filteredBusinesses,
    productMatchesByBusiness,
    favoriteBusinessIds,
    toggleFavorite,
    searchQuery,
    setSearchQuery,
    clearSearch,
  } = useBusinessesScreen();

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
            <Ionicons name="storefront-outline" size={22} color="#0E9F6E" />
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
            color={isFavorite ? "#FFFFFF" : "#0E9F6E"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0E9F6E", "#0891B2"]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{businesses.length} {content.header.subtitleSuffix}</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={content.searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSearch}>
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
            <Text style={styles.emptyTitle}>{content.empty.title}</Text>
            <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
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
    paddingBottom: 24,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardLeft: { flexDirection: "row", flex: 1 },
  iconWrap: { marginRight: 12 },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "600" },
  badgeOpen: { backgroundColor: "#DEF7EC", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeOpenText: { color: "#03543F", fontSize: 12 },
  badgePaused: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgePausedText: { color: "#92400E", fontSize: 12 },
  badgeClosed: { backgroundColor: "#FDE8E8", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeClosedText: { color: "#9B1C1C", fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  meta: { fontSize: 14, color: "#6B7280" },
  metaDot: { marginHorizontal: 4 },
  metaDelivery: { fontSize: 14, color: "#6B7280" },
  address: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  matchedItemsText: { fontSize: 12, color: "#0E9F6E", marginTop: 4 },
  favoriteBtn: { padding: 8 },
  favoriteBtnActive: { backgroundColor: "#0E9F6E", borderRadius: 20 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0E9F6E",
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