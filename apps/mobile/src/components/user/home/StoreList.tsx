import { memo, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Business } from "@/types";
import { getBusinessStatus } from "@utils/businessStatus";
import { categoryEmoji, getFirstImage } from "@hooks/useHomeScreen";
import { StoreListSkeleton } from "@components/Skeleton";
import content from "@/content/home.json";

interface StoreListProps {
  isLoading: boolean;
  safeBusinesses: Business[];
  filteredBusinesses: Business[];
  productMatchesByBusiness: Map<string, string[]>;
  searchQuery: string;
  cartCount: number;
  goToBusiness: (id: string) => void;
  goToCart: () => void;
}

const StoreCardItem = memo(function StoreCardItem({
  business,
  matchedItems,
  matchedPreview,
  extraMatchedCount,
  searchQuery,
  goToBusiness,
}: {
  business: Business;
  matchedItems: string[];
  matchedPreview: string;
  extraMatchedCount: number;
  searchQuery: string;
  goToBusiness: (id: string) => void;
}) {
  const status = getBusinessStatus(business);
  const imageUrl = getFirstImage(business.bannerUrl ?? business.imageUrl);
  const eta = business.estimatedDeliveryTime ?? content.store.defaultEta;

  return (
    <View style={styles.motionWrap}>
      <TouchableOpacity
        style={styles.storeCard}
        activeOpacity={0.9}
        onPress={() => goToBusiness(business.id)}
      >
        <View style={styles.storeImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.storeImage} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#D1FAE5", "#A7F3D0"]} style={styles.storeImageFallback}>
              <Text style={styles.storeImageFallbackEmoji}>{categoryEmoji(business.category)}</Text>
            </LinearGradient>
          )}
          <View
            style={[
              styles.storeStatusBadge,
              status === "open"
                ? styles.storeStatusOpen
                : status === "paused"
                  ? styles.storeStatusPaused
                  : styles.storeStatusClosed,
            ]}
          >
            <Text style={styles.storeStatusText}>
              {status === "open"
                ? content.status.open
                : status === "paused"
                  ? content.status.paused
                  : content.status.closed}
            </Text>
          </View>
        </View>

        <View style={styles.storeBody}>
          <View style={styles.storeHeaderRow}>
            <View style={styles.storeLogo}>
              <Text style={styles.storeLogoEmoji}>{categoryEmoji(business.category)}</Text>
            </View>
            <View style={styles.storeHeaderInfo}>
              <Text style={styles.storeName} numberOfLines={1}>
                {business.name}
              </Text>
              <Text style={styles.storeMeta} numberOfLines={1}>
                {business.category} • ⭐ {Number(business.rating || 0).toFixed(1)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.storeCtaPill}
              activeOpacity={0.85}
              onPress={() => goToBusiness(business.id)}
            >
              <Text style={styles.storeCta}>{content.store.selectStore}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.storeInfoRow}>
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text style={styles.storeAddress} numberOfLines={1}>
              {business.address}
            </Text>
          </View>
          <View style={styles.storeInfoRow}>
            <Ionicons name="time-outline" size={13} color="#94A3B8" />
            <Text style={styles.storeEta}>
              {content.store.deliveryPrefix}
              {eta}
            </Text>
          </View>
          {searchQuery.trim().length > 0 && matchedItems.length > 0 ? (
            <Text style={styles.matchedItemsText} numberOfLines={1}>
              {content.store.itemsPrefix}
              {matchedPreview}
              {extraMatchedCount > 0 ? ` +${extraMatchedCount}${content.store.moreSuffix}` : ""}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
});

export const StoreList = memo(function StoreList({
  isLoading,
  safeBusinesses,
  filteredBusinesses,
  productMatchesByBusiness,
  searchQuery,
  cartCount,
  goToBusiness,
  goToCart,
}: StoreListProps) {
  const title =
    searchQuery.trim().length > 0 ? content.sections.storesSearch : content.sections.storesNear;

  const cards = useMemo(
    () =>
      filteredBusinesses.map((business) => {
        const matchedItems = productMatchesByBusiness.get(business.id) ?? [];
        const matchedPreview = matchedItems.slice(0, 2).join(", ");
        const extraMatchedCount = Math.max(0, matchedItems.length - 2);

        return (
          <StoreCardItem
            key={business.id}
            business={business}
            matchedItems={matchedItems}
            matchedPreview={matchedPreview}
            extraMatchedCount={extraMatchedCount}
            searchQuery={searchQuery}
            goToBusiness={goToBusiness}
          />
        );
      }),
    [filteredBusinesses, goToBusiness, productMatchesByBusiness, searchQuery]
  );

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {cartCount > 0 ? (
          <TouchableOpacity style={styles.cartShortcut} onPress={goToCart}>
            <Ionicons name="cart-outline" size={14} color="#0E9F6E" />
            <Text style={styles.cartShortcutText}>{cartCount}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading && safeBusinesses.length === 0 ? (
        <StoreListSkeleton rows={4} />
      ) : filteredBusinesses.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateTitle}>{content.empty.title}</Text>
          <Text style={styles.stateSubtitle}>{content.empty.subtitle}</Text>
        </View>
      ) : (
        cards
      )}
    </>
  );
});

const styles = StyleSheet.create({
  motionWrap: { width: "100%" },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, color: "#0F172A", fontWeight: "800" },
  cartShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
  },
  cartShortcutText: { fontSize: 12, fontWeight: "800", color: "#0E9F6E" },
  stateWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  stateTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  stateSubtitle: { marginTop: 6, fontSize: 13, color: "#64748B", textAlign: "center" },
  storeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  storeImageWrap: { width: "100%", height: 154, backgroundColor: "#F1F5F9" },
  storeImage: { width: "100%", height: "100%" },
  storeImageFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  storeImageFallbackEmoji: { fontSize: 36 },
  storeStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  storeStatusOpen: { backgroundColor: "#DCFCE7" },
  storeStatusPaused: { backgroundColor: "#FEF3C7" },
  storeStatusClosed: { backgroundColor: "#FEE2E2" },
  storeStatusText: { fontSize: 11, fontWeight: "800", color: "#1F2937" },
  storeBody: { paddingVertical: 12, paddingHorizontal: 12, flex: 1 },
  storeHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  storeLogoEmoji: { fontSize: 22 },
  storeHeaderInfo: { flex: 1 },
  storeInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  storeName: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  storeMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#0E9F6E",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  storeAddress: { flex: 1, fontSize: 12, color: "#64748B" },
  matchedItemsText: { marginTop: 4, fontSize: 11, color: "#0A7D55", fontWeight: "600" },
  storeEta: { fontSize: 12, color: "#475569", fontWeight: "600" },
  storeCtaPill: {
    backgroundColor: "#F59E0B",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  storeCta: { fontSize: 12, color: "#FFFFFF", fontWeight: "800" },
});
