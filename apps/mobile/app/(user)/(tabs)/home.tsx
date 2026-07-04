import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "../../../src/hooks/useRedux";
import { useUserApp } from "../../../src/hooks/useUserApp";
import { ORDER_FEES } from "../../../src/constants";
import { Business, Product } from "../../../src/types";
import { StoreListSkeleton } from "../../../src/components/Skeleton";

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

function categoryEmoji(category: string) {
  const key = category.toLowerCase();
  if (key.includes("grocery")) return "🛒";
  if (key.includes("pharmacy")) return "💊";
  if (key.includes("restaurant")) return "🍽️";
  if (key.includes("cafe")) return "☕";
  if (key.includes("electronics")) return "📱";
  return "🏬";
}

function getFirstImage(url?: string) {
  return url && url.trim().length > 0 ? url : null;
}

export default function UserHome() {
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((state) => state.auth);
  const cartCount = useAppSelector((state) =>
    state.cart.items.reduce((acc, item) => acc + item.quantity, 0)
  );

  const {
    societies,
    selectedSocietyId,
    businesses,
    featuredProducts,
    orders,
    favoriteBusinessIds,
    isLoading,
    initializeHome,
    loadMyOrders,
  } = useUserApp();

  const safeSocieties = Array.isArray(societies) ? societies : [];
  const safeBusinesses = Array.isArray(businesses) ? businesses : [];
  const safeFeaturedProducts = Array.isArray(featuredProducts) ? featuredProducts : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeFavoriteBusinessIds = Array.isArray(favoriteBusinessIds)
    ? favoriteBusinessIds
    : [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const entrance = useState(new Animated.Value(0))[0];

  // Collapsing header: hero top + info pills shrink away on scroll, search stays.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [topRowH, setTopRowH] = useState(0);
  const [infoRowH, setInfoRowH] = useState(0);
  const measured = topRowH > 0 && infoRowH > 0;
  const collapseDistance = Math.max(1, topRowH + infoRowH);
  const topRowHeight = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [topRowH, 0],
    extrapolate: "clamp",
  });
  const infoRowHeight = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [infoRowH, 0],
    extrapolate: "clamp",
  });
  const collapseOpacity = scrollY.interpolate({
    inputRange: [0, collapseDistance * 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    initializeHome().catch(() => null);
    loadMyOrders().catch(() => null);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [initializeHome, loadMyOrders, entrance]);

  const selectedSocietyName =
    safeSocieties.find((society) => society.id === selectedSocietyId)?.name ?? "Your Society";

  const categories = useMemo(() => {
    const unique = Array.from(new Set(safeBusinesses.map((item) => item.category)));
    return ["all", ...unique];
  }, [safeBusinesses]);

  const productMatchesByBusiness = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const map = new Map<string, string[]>();
    if (!query) return map;

    safeFeaturedProducts.forEach((product) => {
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
  }, [safeFeaturedProducts, searchQuery]);

  const filteredBusinesses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return safeBusinesses
      .filter((business) => {
        if (selectedCategory !== "all" && business.category !== selectedCategory) {
          return false;
        }
        if (!query) return true;
        const matchesStore = (
          business.name.toLowerCase().includes(query) ||
          business.category.toLowerCase().includes(query) ||
          business.address.toLowerCase().includes(query)
        );
        return matchesStore || productMatchesByBusiness.has(business.id);
      })
      .sort((a, b) => {
        if (!query) return Number(b.rating || 0) - Number(a.rating || 0);
        const aItemHits = productMatchesByBusiness.get(a.id)?.length ?? 0;
        const bItemHits = productMatchesByBusiness.get(b.id)?.length ?? 0;
        if (aItemHits !== bItemHits) return bItemHits - aItemHits;
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
  }, [safeBusinesses, productMatchesByBusiness, searchQuery, selectedCategory]);

  const businessNameById = useMemo(() => {
    const map = new Map<string, string>();
    safeBusinesses.forEach((business) => map.set(business.id, business.name));
    return map;
  }, [safeBusinesses]);

  const matchedDishes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [] as Product[];
    return safeFeaturedProducts
      .filter((product) => {
        const searchable = [
          product.name,
          product.category,
          product.description ?? "",
          ...(product.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
      .filter((product) => {
        if (selectedCategory === "all") return true;
          const biz = safeBusinesses.find((b) => b.id === product.businessId);
        return biz?.category === selectedCategory;
      })
      .slice(0, 15);
        }, [safeFeaturedProducts, searchQuery, selectedCategory, safeBusinesses]);

  const orderAgainStores = useMemo(() => {
    const seen = new Set<string>();
    const result: Business[] = [];
    const sorted = [...safeOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const order of sorted) {
      if (seen.has(order.businessId)) continue;
      seen.add(order.businessId);
      const biz = safeBusinesses.find((b) => b.id === order.businessId);
      if (biz) result.push(biz);
      if (result.length >= 8) break;
    }
    return result;
  }, [safeOrders, safeBusinesses]);

  const favoriteStores = useMemo(
    () => safeBusinesses.filter((b) => safeFavoriteBusinessIds.includes(b.id)),
    [safeBusinesses, safeFavoriteBusinessIds]
  );

  const offers = useMemo(
    () =>
      safeFeaturedProducts
        .filter(
          (p) =>
            Number(p.discount || 0) > 0 ||
            (p.originalPrice !== undefined && p.originalPrice > p.price)
        )
        .slice(0, 10),
      [safeFeaturedProducts]
  );

  const renderStoreRow = (title: string, list: Business[]) => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/(user)/(tabs)/businesses")}>
          <Text style={styles.viewAllText}>View all ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hRow}
      >
        {list.map((biz) => {
          const status = getBusinessStatus(biz);
          const img = getFirstImage(biz.bannerUrl ?? biz.imageUrl);
          return (
            <TouchableOpacity
              key={biz.id}
              style={styles.oaCard}
              activeOpacity={0.9}
              onPress={() =>
                router.push({ pathname: "/(user)/business", params: { id: biz.id } })
              }
            >
              <View style={styles.oaImageWrap}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.oaImage} contentFit="cover" />
                ) : (
                  <LinearGradient colors={["#D1FAE5", "#A7F3D0"]} style={styles.oaFallback}>
                    <Text style={styles.oaFallbackEmoji}>{categoryEmoji(biz.category)}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.oaBody}>
                <View style={styles.oaLogo}>
                  <Text style={styles.oaLogoEmoji}>{categoryEmoji(biz.category)}</Text>
                </View>
                <View style={styles.oaInfo}>
                  <Text style={styles.oaName} numberOfLines={1}>{biz.name}</Text>
                  <Text style={styles.oaCategory} numberOfLines={1}>{biz.category}</Text>
                </View>
                <View style={styles.oaRatingCol}>
                  <View style={styles.oaRatingPill}>
                    <Ionicons name="star" size={11} color="#0E9F6E" />
                    <Text style={styles.oaRatingText}>{Number(biz.rating || 0).toFixed(1)}</Text>
                  </View>
                  <View style={styles.oaStatusRow}>
                    <View
                      style={[
                        styles.oaStatusDot,
                        status === "open" ? styles.dotOpen : status === "paused" ? styles.dotPaused : styles.dotClosed,
                      ]}
                    />
                    <Text style={styles.oaStatusText}>
                      {status === "open" ? "Open" : status === "paused" ? "Paused" : "Closed"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderPromoBanner = () => (
    <TouchableOpacity
      style={styles.promoWrap}
      activeOpacity={0.9}
      onPress={() => router.push("/(user)/(tabs)/businesses")}
    >
      <LinearGradient
        colors={["#FBBF24", "#F59E0B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoCard}
      >
        <View style={styles.promoTextCol}>
          <Text style={styles.promoTitle}>Flat 20% OFF</Text>
          <Text style={styles.promoSub}>on your first order</Text>
          <View style={styles.promoCodePill}>
            <Text style={styles.promoCodeText}>Use code: MOHALLA20</Text>
          </View>
        </View>
        <Text style={styles.promoEmoji}>🛍️</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0E9F6E", "#059669", "#0891B2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroWrap, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.heroGlowCircle} />
        <Animated.View
          onLayout={(e) => {
            if (topRowH === 0) setTopRowH(e.nativeEvent.layout.height);
          }}
          style={measured ? { height: topRowHeight, opacity: collapseOpacity, overflow: "hidden" } : undefined}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>Resident Home</Text>
              <Text style={styles.heroTitle}>Pick a store, then shop</Text>
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {selectedSocietyName}
              </Text>
            </View>
            <TouchableOpacity style={styles.profileChip} onPress={() => router.push("/(user)/profile")}>
              <Text style={styles.profileChipText}>{(user?.firstName || "U").charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#6B7280" />
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

        <Animated.View
          onLayout={(e) => {
            if (infoRowH === 0) setInfoRowH(e.nativeEvent.layout.height);
          }}
          style={measured ? { height: infoRowHeight, opacity: collapseOpacity, overflow: "hidden" } : undefined}
        >
          <View style={styles.heroInfoRow}>
            <View style={styles.heroInfoPill}>
              <Ionicons name="storefront-outline" size={13} color="#FFFFFF" />
              <Text style={styles.heroInfoText} numberOfLines={1}>{safeBusinesses.length} stores</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#FFFFFF" />
              <Text style={styles.heroInfoText} numberOfLines={1}>Secure checkout</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="wallet-outline" size={13} color="#FFFFFF" />
              <Text style={styles.heroInfoText} numberOfLines={1}>Min Rs {ORDER_FEES.MINIMUM_ORDER}</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {searchQuery.trim().length === 0 ? (
          <>
            {orderAgainStores.length > 0 ? renderStoreRow("Order again", orderAgainStores) : null}
            {renderPromoBanner()}
            {favoriteStores.length > 0 ? renderStoreRow("Your favorites", favoriteStores) : null}
            {offers.length > 0 ? (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Offers near you</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                >
                  {offers.map((p) => {
                    const img = getFirstImage(p.imageUrls?.[0]);
                    const store = businessNameById.get(p.businessId) ?? "Store";
                    const disc = Number(p.discount || 0);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.offerCard}
                        activeOpacity={0.9}
                        onPress={() =>
                          router.push({
                            pathname: "/(user)/business",
                            params: { id: p.businessId, highlightProductId: p.id },
                          })
                        }
                      >
                        <View style={styles.offerImageWrap}>
                          {img ? (
                            <Image source={{ uri: img }} style={styles.offerImage} contentFit="cover" />
                          ) : (
                            <View style={styles.offerFallback}>
                              <Text style={styles.dishFallbackEmoji}>🛍️</Text>
                            </View>
                          )}
                          {disc > 0 ? (
                            <View style={styles.offerBadge}>
                              <Text style={styles.offerBadgeText}>{disc}% OFF</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.offerName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.offerStore} numberOfLines={1}>{store}</Text>
                        <View style={styles.offerPriceRow}>
                          <Text style={styles.offerPrice}>Rs {p.price}</Text>
                          {p.originalPrice && p.originalPrice > p.price ? (
                            <Text style={styles.offerOriginal}>Rs {p.originalPrice}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Choose a category</Text>
          <TouchableOpacity onPress={() => router.push("/(user)/(tabs)/businesses") }>
            <Text style={styles.viewAllText}>See all stores</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((category) => {
            const active = category === selectedCategory;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryChipText, active ? styles.categoryChipTextActive : null]}>
                  {category === "all" ? "All" : `${categoryEmoji(category)} ${category}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {searchQuery.trim().length > 0 && matchedDishes.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Dishes</Text>
              <Text style={styles.resultCountText}>{matchedDishes.length} found</Text>
            </View>
            <View style={styles.dishList}>
              {matchedDishes.map((dish) => {
                const dishImg = getFirstImage(dish.imageUrls?.[0]);
                const storeName = businessNameById.get(dish.businessId) ?? "Store";
                return (
                  <TouchableOpacity
                    key={dish.id}
                    style={styles.dishCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/(user)/business",
                        params: { id: dish.businessId, highlightProductId: dish.id },
                      })
                    }
                  >
                    <View style={styles.dishImageWrap}>
                      {dishImg ? (
                        <Image source={{ uri: dishImg }} style={styles.dishImage} contentFit="cover" />
                      ) : (
                        <View style={styles.dishImageFallback}>
                          <Text style={styles.dishFallbackEmoji}>🛍️</Text>
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
                        <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                      </View>
                      <Text style={styles.dishStore} numberOfLines={1}>From {storeName}</Text>
                      <Text style={styles.dishPrice}>Rs {dish.price}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim().length > 0 ? "Stores" : "Stores near you"}
          </Text>
          {cartCount > 0 ? (
            <TouchableOpacity style={styles.cartShortcut} onPress={() => router.push("/(user)/cart")}>
              <Ionicons name="cart-outline" size={14} color="#0E9F6E" />
              <Text style={styles.cartShortcutText}>{cartCount}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isLoading && safeBusinesses.length === 0 ? (
          <StoreListSkeleton rows={4} />
        ) : filteredBusinesses.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateTitle}>No stores found</Text>
            <Text style={styles.stateSubtitle}>Try changing your search or category.</Text>
          </View>
        ) : (
          filteredBusinesses.map((business, index) => {
            const status = getBusinessStatus(business);
            const imageUrl = getFirstImage(business.bannerUrl ?? business.imageUrl);
            const eta = business.estimatedDeliveryTime ?? "25-35 mins";
            const matchedItems = productMatchesByBusiness.get(business.id) ?? [];
            const matchedPreview = matchedItems.slice(0, 2).join(", ");
            const extraMatchedCount = Math.max(0, matchedItems.length - 2);

            return (
              <Animated.View
                key={business.id}
                style={[
                  styles.motionWrap,
                  {
                    opacity: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                    transform: [
                      {
                        translateY: entrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10 + Math.min(index * 2, 8), 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.storeCard}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: "/(user)/business", params: { id: business.id } })}
                >
                  <View style={styles.storeImageWrap}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.storeImage} contentFit="cover" />
                    ) : (
                      <LinearGradient
                        colors={["#D1FAE5", "#A7F3D0"]}
                        style={styles.storeImageFallback}
                      >
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
                        {status === "open" ? "Open" : status === "paused" ? "Paused" : "Closed"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.storeBody}>
                    <View style={styles.storeHeaderRow}>
                      <View style={styles.storeLogo}>
                        <Text style={styles.storeLogoEmoji}>{categoryEmoji(business.category)}</Text>
                      </View>
                      <View style={styles.storeHeaderInfo}>
                        <Text style={styles.storeName} numberOfLines={1}>{business.name}</Text>
                        <Text style={styles.storeMeta} numberOfLines={1}>
                          {business.category} • ⭐ {Number(business.rating || 0).toFixed(1)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.storeCtaPill}
                        activeOpacity={0.85}
                        onPress={() => router.push({ pathname: "/(user)/business", params: { id: business.id } })}
                      >
                        <Text style={styles.storeCta}>Select Store</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.storeInfoRow}>
                      <Ionicons name="location-outline" size={13} color="#94A3B8" />
                      <Text style={styles.storeAddress} numberOfLines={1}>{business.address}</Text>
                    </View>
                    <View style={styles.storeInfoRow}>
                      <Ionicons name="time-outline" size={13} color="#94A3B8" />
                      <Text style={styles.storeEta}>Delivery: {eta}</Text>
                    </View>
                    {searchQuery.trim().length > 0 && matchedItems.length > 0 ? (
                      <Text style={styles.matchedItemsText} numberOfLines={1}>
                        Items: {matchedPreview}{extraMatchedCount > 0 ? ` +${extraMatchedCount} more` : ""}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  motionWrap: { width: "100%" },
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  scrollContent: { paddingBottom: 24 },
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
  hRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  hStoreCard: { width: 150 },
  hStoreImageWrap: {
    width: 150,
    height: 92,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 6,
  },
  hStoreImage: { width: "100%", height: "100%" },
  hStoreFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  hStoreFallbackEmoji: { fontSize: 34 },
  hStatusDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  dotOpen: { backgroundColor: "#16A34A" },
  dotPaused: { backgroundColor: "#F59E0B" },
  dotClosed: { backgroundColor: "#9CA3AF" },
  hStoreName: { fontSize: 13.5, fontWeight: "700", color: "#111827" },
  hStoreMeta: { fontSize: 11.5, color: "#6B7280", marginTop: 1 },
  offerCard: { width: 140 },
  offerImageWrap: {
    width: 140,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 6,
  },
  offerImage: { width: "100%", height: "100%" },
  offerFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  offerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offerBadgeText: { fontSize: 10.5, fontWeight: "800", color: "#FFFFFF" },
  offerName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  offerStore: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  offerPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  offerPrice: { fontSize: 13, fontWeight: "800", color: "#0E9F6E" },
  offerOriginal: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through" },
  heroWrap: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 16,
    paddingBottom: 18,
    overflow: "hidden",
  },
  heroGlowCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -46,
    right: -30,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroEyebrow: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontWeight: "700", letterSpacing: 0.4 },
  heroTitle: { marginTop: 3, fontSize: 26, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.4 },
  heroSubtitle: { marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.88)", fontWeight: "600" },
  profileChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  profileChipText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  searchWrap: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "600" },
  heroInfoRow: { marginTop: 12, flexDirection: "row", gap: 6 },
  heroInfoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  heroInfoText: { fontSize: 10.5, color: "#FFFFFF", fontWeight: "700" },
  oaCard: {
    width: 252,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  oaImageWrap: { width: "100%", height: 112, backgroundColor: "#F1F5F9" },
  oaImage: { width: "100%", height: "100%" },
  oaFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  oaFallbackEmoji: { fontSize: 40 },
  oaBody: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  oaLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  oaLogoEmoji: { fontSize: 18 },
  oaInfo: { flex: 1 },
  oaName: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  oaCategory: { fontSize: 11.5, color: "#64748B", marginTop: 1, textTransform: "capitalize" },
  oaRatingCol: { alignItems: "flex-end", gap: 3 },
  oaRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  oaRatingText: { fontSize: 11.5, fontWeight: "800", color: "#0E9F6E" },
  oaStatusRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  oaStatusDot: { width: 7, height: 7, borderRadius: 4 },
  oaStatusText: { fontSize: 10.5, fontWeight: "700", color: "#64748B" },
  promoWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  promoCard: { flexDirection: "row", alignItems: "center", padding: 18 },
  promoTextCol: { flex: 1 },
  promoTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  promoSub: { fontSize: 13.5, fontWeight: "700", color: "rgba(255,255,255,0.95)", marginTop: 2 },
  promoCodePill: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promoCodeText: { fontSize: 12, fontWeight: "800", color: "#B45309", letterSpacing: 0.3 },
  promoEmoji: { fontSize: 56, marginLeft: 8 },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, color: "#0F172A", fontWeight: "800" },
  viewAllText: { fontSize: 12, color: "#0E9F6E", fontWeight: "700" },
  categoryRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#F3F4F6",
  },
  categoryChipActive: { backgroundColor: "#0E9F6E" },
  categoryChipText: { fontSize: 12, fontWeight: "700", color: "#1E293B", textTransform: "capitalize" },
  categoryChipTextActive: { color: "#FFFFFF" },
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
  stateWrap: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 20 },
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
  storeMeta: { marginTop: 2, fontSize: 12, color: "#0E9F6E", fontWeight: "700", textTransform: "capitalize" },
  storeAddress: { flex: 1, fontSize: 12, color: "#64748B" },
  matchedItemsText: { marginTop: 4, fontSize: 11, color: "#0A7D55", fontWeight: "600" },
  storeBottomRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  storeEta: { fontSize: 12, color: "#475569", fontWeight: "600" },
  storeCtaPill: {
    backgroundColor: "#F59E0B",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  storeCta: { fontSize: 12, color: "#FFFFFF", fontWeight: "800" },
});
