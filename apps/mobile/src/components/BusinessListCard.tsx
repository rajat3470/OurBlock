import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Business } from "@/types";
import { getBusinessStatus } from "@utils/businessStatus";
import content from "@/content/businesses.json";

interface BusinessListCardProps {
  business: Business;
  isFavorite: boolean;
  matchedItems: string[];
  searchActive: boolean;
  onPress: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function BusinessListCard({
  business,
  isFavorite,
  matchedItems,
  searchActive,
  onPress,
  onToggleFavorite,
}: BusinessListCardProps) {
  const isSuspended = !!(business as any).suspendedAt;
  const bizStatus = getBusinessStatus(business);
  const matchedPreview = matchedItems.slice(0, 2).join(", ");
  const extraMatchedCount = Math.max(0, matchedItems.length - 2);

  const handleFavorite = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onToggleFavorite(business.id);
  };

  return (
    <TouchableOpacity
      style={[styles.card, isSuspended ? styles.cardSuspended : null]}
      onPress={() => !isSuspended && onPress(business.id)}
      activeOpacity={isSuspended ? 1 : 0.85}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconWrap, isSuspended ? styles.iconWrapSuspended : null]}>
          <Ionicons
            name={isSuspended ? "ban-outline" : "storefront-outline"}
            size={22}
            color={isSuspended ? "#9CA3AF" : "#0E9F6E"}
          />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isSuspended ? styles.nameSuspended : null]} numberOfLines={1}>
              {business.name}
            </Text>
            {isSuspended ? (
              <View style={styles.badgeSuspended}>
                <Text style={styles.badgeSuspendedText}>Vendor Unavailable</Text>
              </View>
            ) : (
              <>
                {bizStatus === "open" && (
                  <View style={styles.badgeOpen}><Text style={styles.badgeOpenText}>{content.status.open}</Text></View>
                )}
                {bizStatus === "paused" && (
                  <View style={styles.badgePaused}><Text style={styles.badgePausedText}>{content.status.paused}</Text></View>
                )}
                {bizStatus === "closed" && (
                  <View style={styles.badgeClosed}><Text style={styles.badgeClosedText}>{content.status.closed}</Text></View>
                )}
              </>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{business.category}</Text>
            {business.estimatedDeliveryTime && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaDelivery}>{content.card.deliveryPrefix}{business.estimatedDeliveryTime}</Text>
              </>
            )}
          </View>
          <Text style={styles.address} numberOfLines={1}>{business.address}</Text>
          {searchActive && matchedItems.length > 0 ? (
            <Text style={styles.matchedItemsText} numberOfLines={1}>
              {content.card.itemsLabel} {matchedPreview}{extraMatchedCount > 0 ? ` +${extraMatchedCount} ${content.card.moreSuffix}` : ""}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.favoriteBtn, isFavorite ? styles.favoriteBtnActive : null]}
        onPress={handleFavorite}
      >
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={18}
          color={isFavorite ? "#FFFFFF" : "#0E9F6E"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#ECFDF5",
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
    color: "#0E9F6E",
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
    color: "#0A7D55",
    fontWeight: "600",
  },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    marginLeft: 8,
  },
  favoriteBtnActive: {
    backgroundColor: "#0E9F6E",
  },
  cardSuspended: {
    backgroundColor: "#F9FAFB",
    opacity: 0.72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  iconWrapSuspended: {
    backgroundColor: "#F3F4F6",
  },
  nameSuspended: {
    color: "#9CA3AF",
  },
  badgeSuspended: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeSuspendedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
});
