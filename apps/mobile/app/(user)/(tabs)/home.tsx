import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Business } from "@/types";
import { StoreListSkeleton } from "@components/Skeleton";
import { useHomeScreen } from "@hooks/useHomeScreen";
import content from "@/content/home.json";

export default function UserHome() {
  const insets = useSafeAreaInsets();
  const {
    user,
    cartCount,
    isLoading,
    safeBusinesses,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    entrance,
    scrollY,
    topRowH,
    setTopRowH,
    infoRowH,
    setInfoRowH,
    measured,
    topRowHeight,
    infoRowHeight,
    collapseOpacity,
    selectedSocietyName,
    categories,
    productMatchesByBusiness,
    filteredBusinesses,
    businessNameById,
    matchedDishes,
    orderAgainStores,
    favoriteStores,
    minimumOrder,
    goToBusinesses,
    goToAddresses,
    goToProfile,
    goToCart,
    goToBusiness,
    goToDish,
    getBusinessStatus,
    categoryEmoji,
    getFirstImage,
  } = useHomeScreen();

  const renderStoreRow = (title: string, list: Business[]) => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={goToBusinesses}>
          <Text style={styles.viewAllText}>{content.sections.viewAll}</Text>
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
              onPress={() => goToBusiness(biz.id)}
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
                      {status === "open" ? content.status.open : status === "paused" ? content.status.paused : content.status.closed}
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
      onPress={goToBusinesses}
    >
      <LinearGradient
        colors={["#FBBF24", "#F59E0B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoCard}
      >
        <View style={styles.promoTextCol}>
          <Text style={styles.promoTitle}>{content.promo.title}</Text>
          <Text style={styles.promoSub}>{content.promo.subtitle}</Text>
          <View style={styles.promoCodePill}>
            <Text style={styles.promoCodeText}>{content.promo.code}</Text>
          </View>
        </View>
        <Text style={styles.promoEmoji}>{content.promo.emoji}</Text>
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
              <Text style={styles.heroBrand}>{content.brand}</Text>
              <Text style={styles.heroDeliverLabel}>{content.deliverTo}</Text>
              <TouchableOpacity
                style={styles.heroLocationRow}
                activeOpacity={0.8}
                onPress={goToAddresses}
              >
                <Ionicons name="location" size={16} color="#FFFFFF" />
                <Text style={styles.heroLocation} numberOfLines={1}>{selectedSocietyName}</Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.profileChip} onPress={goToProfile}>
              <Text style={styles.profileChipText}>{(user?.firstName || content.defaultProfileInitial).charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={content.searchPlaceholder}
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
              <Text style={styles.heroInfoText} numberOfLines={1}>{safeBusinesses.length}{content.hero.storesSuffix}</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#FFFFFF" />
              <Text style={styles.heroInfoText} numberOfLines={1}>{content.hero.secureCheckout}</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="wallet-outline" size={13} color="#FFFFFF" />
              <Text style={styles.heroInfoText} numberOfLines={1}>{content.hero.minPrefix}{minimumOrder}</Text>
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
            {orderAgainStores.length > 0 ? renderStoreRow(content.sections.orderAgain, orderAgainStores) : null}
            {renderPromoBanner()}
            {favoriteStores.length > 0 ? renderStoreRow(content.sections.favorites, favoriteStores) : null}
          </>
        ) : null}

        {searchQuery.trim().length > 0 && matchedDishes.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{content.sections.dishes}</Text>
              <Text style={styles.resultCountText}>{matchedDishes.length}{content.sections.foundSuffix}</Text>
            </View>
            <View style={styles.dishList}>
              {matchedDishes.map((dish) => {
                const dishImg = getFirstImage(dish.imageUrls?.[0]);
                const storeName = businessNameById.get(dish.businessId) ?? content.dish.defaultStore;
                return (
                  <TouchableOpacity
                    key={dish.id}
                    style={styles.dishCard}
                    activeOpacity={0.85}
                    onPress={() => goToDish(dish)}
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
                        <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                      </View>
                      <Text style={styles.dishStore} numberOfLines={1}>{content.dish.fromPrefix}{storeName}</Text>
                      <Text style={styles.dishPrice}>{content.currency} {dish.price}</Text>
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
            {searchQuery.trim().length > 0 ? content.sections.storesSearch : content.sections.storesNear}
          </Text>
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
          filteredBusinesses.map((business, index) => {
            const status = getBusinessStatus(business);
            const imageUrl = getFirstImage(business.bannerUrl ?? business.imageUrl);
            const eta = business.estimatedDeliveryTime ?? content.store.defaultEta;
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
                  onPress={() => goToBusiness(business.id)}
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
                        {status === "open" ? content.status.open : status === "paused" ? content.status.paused : content.status.closed}
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
                        onPress={() => goToBusiness(business.id)}
                      >
                        <Text style={styles.storeCta}>{content.store.selectStore}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.storeInfoRow}>
                      <Ionicons name="location-outline" size={13} color="#94A3B8" />
                      <Text style={styles.storeAddress} numberOfLines={1}>{business.address}</Text>
                    </View>
                    <View style={styles.storeInfoRow}>
                      <Ionicons name="time-outline" size={13} color="#94A3B8" />
                      <Text style={styles.storeEta}>{content.store.deliveryPrefix}{eta}</Text>
                    </View>
                    {searchQuery.trim().length > 0 && matchedItems.length > 0 ? (
                      <Text style={styles.matchedItemsText} numberOfLines={1}>
                        {content.store.itemsPrefix}{matchedPreview}{extraMatchedCount > 0 ? ` +${extraMatchedCount}${content.store.moreSuffix}` : ""}
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipText: { fontSize: 16, fontWeight: "800", color: "#0E9F6E" },
  heroBrand: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.9)", letterSpacing: 0.2 },
  heroDeliverLabel: { marginTop: 8, fontSize: 11.5, color: "rgba(255,255,255,0.82)", fontWeight: "600" },
  heroLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  heroLocation: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", maxWidth: 240 },
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
  catTileLabel: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#475569", textTransform: "capitalize" },
  catTileLabelActive: { color: "#B45309" },
  catUnderline: { marginTop: 4, height: 3, width: 20, borderRadius: 2, backgroundColor: "transparent" },
  catUnderlineActive: { backgroundColor: "#F59E0B" },
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
