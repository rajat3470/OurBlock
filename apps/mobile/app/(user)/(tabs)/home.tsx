import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "react-native-toast-notifications";
import { useAppDispatch, useAppSelector } from "../../../src/hooks/useRedux";
import { useUserApp } from "../../../src/hooks/useUserApp";
import { userAppService } from "../../../src/services/userAppService";
import { addItem, updateQuantity } from "../../../src/store/slices/cartSlice";

const FILTER_TAGS = ["Near & Fast", "Top Rated", "Great Offers", "New Arrivals"];

const QUICK_ACTIONS = [
  { key: "offers", icon: "🏷️", label: "Offers" },
  { key: "top10", icon: "⭐", label: "Top 10" },
  { key: "trending", icon: "🔥", label: "Trending" },
  { key: "daily", icon: "🥬", label: "Daily Essentials" },
];

const CATEGORY_ICON: Record<string, string> = {
  all: "🍽️",
  grocery: "🛒",
  restaurant: "🍛",
  pharmacy: "💊",
  cafe: "☕",
  electronics: "📱",
  dessert: "🍰",
  snacks: "🍟",
  beverages: "🥤",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const DYNAMIC_BANNER_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getEpoch(value: any): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (typeof value?._seconds === "number") return value._seconds * 1000;
  return 0;
}

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function getFirstImageUrl(images?: string[]) {
  return images?.find((url) => typeof url === "string" && url.trim().length > 0) ?? null;
}

function isVerifiedProduct(product: any) {
  return Boolean(product?.isVerified) || product?.approvalStatus === "approved";
}

function addressMatchesSociety(addressText: string, societyName: string) {
  const normalizedAddress = addressText.toLowerCase();
  const normalizedSociety = societyName.toLowerCase();
  return normalizedAddress.includes(normalizedSociety);
}

function HomeSkeleton() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroWrap}>
        <View style={[styles.skeleton, styles.skeletonHeader]} />
        <View style={[styles.skeleton, styles.skeletonSearch]} />
        <View style={[styles.skeleton, styles.skeletonBanner]} />
      </View>

      <View style={styles.rowPad}>
        <View style={[styles.skeleton, styles.skeletonTab]} />
        <View style={[styles.skeleton, styles.skeletonTab]} />
        <View style={[styles.skeleton, styles.skeletonTab]} />
        <View style={[styles.skeleton, styles.skeletonTab]} />
      </View>

      <View style={styles.rowPad}>
        <View style={[styles.skeleton, styles.skeletonChip]} />
        <View style={[styles.skeleton, styles.skeletonChip]} />
        <View style={[styles.skeleton, styles.skeletonChip]} />
      </View>

      <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>
      <View style={styles.productGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={styles.productCard}>
            <View style={[styles.skeleton, styles.skeletonProductImage]} />
            <View style={[styles.skeleton, styles.skeletonLineLg]} />
            <View style={[styles.skeleton, styles.skeletonLineMd]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function UserHome() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const {
    societies,
    selectedSocietyId,
    businesses,
    banners,
    featuredProducts,
    isLoading,
    initializeHome,
    selectSociety,
  } = useUserApp();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [addressSocietyIds, setAddressSocietyIds] = useState<string[]>([]);

  useEffect(() => {
    initializeHome().catch(() => null);
  }, [initializeHome]);

  useEffect(() => {
    const loadAddressSocieties = async () => {
      try {
        const addresses = await userAppService.getAddresses();
        if (addresses.length <= 1) {
          setAddressSocietyIds([]);
          return;
        }

        const matchedIds = new Set<string>();
        addresses.forEach((address) => {
          const searchable = [
            address.name,
            address.street,
            address.landmark,
            address.city,
            address.state,
            address.pincode,
          ]
            .filter(Boolean)
            .join(" ");

          societies.forEach((society) => {
            if (addressMatchesSociety(searchable, society.name)) {
              matchedIds.add(society.id);
            }
          });
        });

        // Only show filter chips when there are multiple unique societies from addresses.
        if (matchedIds.size > 1) {
          setAddressSocietyIds(Array.from(matchedIds));
        } else {
          setAddressSocietyIds([]);
        }
      } catch {
        setAddressSocietyIds([]);
      }
    };

    if (societies.length > 0) {
      loadAddressSocieties().catch(() => null);
    }
  }, [societies]);

  const activeSocietyId = user?.societyId ?? selectedSocietyId;
  const selectedSocietyName =
    societies.find((society) => society.id === activeSocietyId)?.name ?? "Your Society";

  const visibleAddressSocieties = useMemo(
    () => societies.filter((society) => addressSocietyIds.includes(society.id)),
    [addressSocietyIds, societies]
  );

  const activeBanners = useMemo(() => {
    if (!Array.isArray(banners)) return [];
    return [...banners]
      .filter((banner) => banner?.isActive && banner?.imageUrl)
      .sort((a, b) => Number(a.sortOrder ?? 100) - Number(b.sortOrder ?? 100))
      .slice(0, 5);
  }, [banners]);

  const businessesById = useMemo(() => {
    const map = new Map<string, (typeof businesses)[number]>();
    businesses.forEach((business) => map.set(business.id, business));
    return map;
  }, [businesses]);

  const categoryTabs = useMemo(() => {
    const keys = new Set<string>();
    featuredProducts.forEach((product) => {
      const key = String(product.category || "").toLowerCase().trim();
      if (key) keys.add(key);
    });

    return [
      { key: "all", label: "All", icon: CATEGORY_ICON.all },
      ...Array.from(keys)
        .slice(0, 10)
        .map((key) => ({
          key,
          label: toTitleCase(key),
          icon: CATEGORY_ICON[key] ?? "🍱",
        })),
    ];
  }, [featuredProducts]);

  const filteredProducts = useMemo(() => {
    let list = featuredProducts;

    list = list.filter(isVerifiedProduct);

    if (selectedCategory !== "all") {
      list = list.filter(
        (product) => String(product.category || "").toLowerCase() === selectedCategory
      );
    }

    if (query.trim()) {
      list = list.filter((product) => {
        const store = businessesById.get(product.businessId);
        return (
          matchesQuery(product.name, query) ||
          matchesQuery(String(product.category || ""), query) ||
          matchesQuery(store?.name ?? "", query)
        );
      });
    }

    if (selectedTag === "Near & Fast") {
      list = list.filter((product) => {
        const eta = Number(businessesById.get(product.businessId)?.metadata?.etaMins ?? 25);
        return eta <= 22;
      });
    }

    if (selectedTag === "Top Rated") {
      list = list.filter((product) => Number(product.rating || 0) >= 4.2);
    }

    if (selectedTag === "Great Offers") {
      list = list.filter((product) => Number(product.discount || 0) > 0);
    }

    if (selectedTag === "New Arrivals") {
      list = [...list].sort(
        (a, b) => getEpoch(b.createdAt) - getEpoch(a.createdAt)
      );
    } else {
      list = [...list].sort((a, b) => {
        const discountDelta = Number(b.discount || 0) - Number(a.discount || 0);
        if (discountDelta !== 0) return discountDelta;
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
    }

    return list;
  }, [
    businessesById,
    featuredProducts,
    query,
    selectedCategory,
    selectedTag,
  ]);

  const filteredBusinesses = useMemo(() => {
    let list = [...businesses];

    if (query.trim()) {
      list = list.filter(
        (business) =>
          matchesQuery(business.name, query) ||
          matchesQuery(String(business.category || ""), query) ||
          matchesQuery(business.address, query)
      );
    }

    if (selectedTag === "Near & Fast") {
      list = list.filter((business) => Number(business.metadata?.etaMins ?? 25) <= 22);
    }

    if (selectedTag === "Top Rated") {
      list = list.filter((business) => Number(business.rating || 0) >= 4.2);
    }

    list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return list.slice(0, 10);
  }, [businesses, query, selectedTag]);

  const onSearchPress = () => {
    if (!query.trim()) {
      toast.show("Type something to search", { type: "warning" });
      return;
    }
    toast.show(`Showing results for: ${query.trim()}`, { type: "normal" });
  };

  const onQuickAction = (key: string) => {
    if (key === "offers") {
      setSelectedTag("Great Offers");
      toast.show("Offers filter applied", { type: "normal" });
      return;
    }

    if (key === "top10") {
      setSelectedTag("Top Rated");
      toast.show("Top rated filter applied", { type: "normal" });
      return;
    }

    if (key === "trending") {
      setSelectedTag("New Arrivals");
      toast.show("Trending filter applied", { type: "normal" });
      return;
    }

    const hasGrocery = categoryTabs.some((tab) => tab.key === "grocery");
    if (hasGrocery) {
      setSelectedCategory("grocery");
      toast.show("Daily essentials selected", { type: "normal" });
    } else {
      toast.show("No grocery category found yet", { type: "warning" });
    }
  };

  if (isLoading && businesses.length === 0 && featuredProducts.length === 0) {
    return (
      <View style={styles.container}>
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={["#DC2626", "#991B1B", "#7F1D1D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroWrap, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.locationRow}>
              <View style={styles.locationLeft}>
                <Text style={styles.locationTitle}>Home</Text>
                <Text style={styles.locationSubtitle} numberOfLines={1}>
                  {selectedSocietyName}
                </Text>
              </View>
              <View style={styles.locationRight}>
                {cartItems.length > 0 ? (
                  <TouchableOpacity
                    style={styles.cartHeaderBtn}
                    onPress={() => router.push("/(user)/cart")}
                  >
                    <Ionicons name="cart-outline" size={18} color="#DC2626" />
                    <Text style={styles.cartHeaderText}>
                      {cartItems.reduce((s, i) => s + i.quantity, 0)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push("/(user)/profile")}>
                  <Text style={styles.avatarText}>{(user?.firstName || "U").charAt(0).toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            </View>

          {!user?.isPhoneVerified ? (
            <TouchableOpacity style={styles.noticeBar} onPress={() => router.push("/(user)/verify-phone")}>
              <Text style={styles.noticeText}>Verify phone before placing your first order</Text>
              <Text style={styles.noticeCta}>Verify</Text>
            </TouchableOpacity>
          ) : null}

          {activeBanners.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bannerCarouselRow}
            >
              {activeBanners.map((banner) => (
                <TouchableOpacity
                  key={banner.id}
                  activeOpacity={0.92}
                  style={styles.dynamicBannerCard}
                  onPress={() => {
                    if (!banner.ctaRoute) return;
                    try {
                      router.push(banner.ctaRoute as any);
                    } catch {
                      toast.show("Unable to open banner link", { type: "warning" });
                    }
                  }}
                >
                  <Image
                    source={{ uri: banner.imageUrl }}
                    style={styles.dynamicBannerImage}
                    contentFit="cover"
                    contentPosition="center"
                  />
                  <View style={styles.dynamicBannerOverlay}>
                    <Text style={styles.dynamicBannerEyebrow} numberOfLines={1}>
                      {banner.tagText || "TRENDING IN YOUR SOCIETY"}
                    </Text>
                    <Text style={styles.dynamicBannerTitle} numberOfLines={2}>
                      {banner.title}
                    </Text>
                    {banner.subtitle ? (
                      <Text style={styles.dynamicBannerSubtitle} numberOfLines={2}>
                        {banner.subtitle}
                      </Text>
                    ) : null}

                    <View style={styles.bannerMiniRow}>
                      <View style={styles.bannerMiniTile}>
                        <Text style={styles.bannerMiniTitle}>Products</Text>
                        <Text style={styles.bannerMiniValue}>{featuredProducts.length}</Text>
                      </View>
                      <View style={styles.bannerMiniTile}>
                        <Text style={styles.bannerMiniTitle}>Shops</Text>
                        <Text style={styles.bannerMiniValue}>{businesses.length}</Text>
                      </View>
                      <View style={styles.bannerMiniTile}>
                        <Text style={styles.bannerMiniTitle}>Fastest ETA</Text>
                        <Text style={styles.bannerMiniValue}>20m</Text>
                      </View>
                    </View>

                    {banner.ctaText ? (
                      <View style={styles.dynamicBannerCtaWrap}>
                        <Text style={styles.dynamicBannerCta}>{banner.ctaText}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.bannerCard}>
              <Text style={styles.bannerEyebrow}>TRENDING IN YOUR SOCIETY</Text>
              <Text style={styles.bannerTitle}>Top picks, fresh deals, and local bestsellers</Text>
              <View style={styles.bannerMiniRow}>
                <View style={styles.bannerMiniTile}>
                  <Text style={styles.bannerMiniTitle}>Products</Text>
                  <Text style={styles.bannerMiniValue}>{featuredProducts.length}</Text>
                </View>
                <View style={styles.bannerMiniTile}>
                  <Text style={styles.bannerMiniTitle}>Shops</Text>
                  <Text style={styles.bannerMiniValue}>{businesses.length}</Text>
                </View>
                <View style={styles.bannerMiniTile}>
                  <Text style={styles.bannerMiniTitle}>Fastest ETA</Text>
                  <Text style={styles.bannerMiniValue}>20m</Text>
                </View>
              </View>
            </View>
          )}

          {visibleAddressSocieties.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.societyRow}
            >
              {visibleAddressSocieties.map((society) => {
                const selected = activeSocietyId === society.id;
                return (
                  <TouchableOpacity
                    key={society.id}
                    style={[styles.societyChip, selected ? styles.societyChipActive : null]}
                    onPress={() => selectSociety(society.id)}
                  >
                    <Text style={[styles.societyLabel, selected ? styles.societyLabelActive : null]}>
                      {society.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.heroSearchWrap}>
            <View style={styles.heroSearchInput}>
              <Ionicons name="search-outline" size={17} color="rgba(0,0,0,0.35)" style={{ marginRight: 10 }} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search products, brands or stores"
                placeholderTextColor="rgba(0,0,0,0.35)"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={onSearchPress}
              />
              {query.trim() ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={17} color="rgba(0,0,0,0.35)" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categoryTabs.map((tab) => {
            const selected = selectedCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.categoryItem}
                onPress={() => setSelectedCategory(tab.key)}
              >
                <View style={[styles.categoryIconWrap, selected ? styles.categoryIconWrapActive : null]}>
                  <Text style={styles.categoryIcon}>{tab.icon}</Text>
                </View>
                <Text style={[styles.categoryLabel, selected ? styles.categoryLabelActive : null]}>
                  {tab.label}
                </Text>
                {selected ? <View style={styles.categoryUnderline} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
        >
          {FILTER_TAGS.map((tag) => {
            const selected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selected ? styles.tagChipActive : null]}
                onPress={() => setSelectedTag((prev) => (prev === tag ? null : tag))}
              >
                <Text style={[styles.tagText, selected ? styles.tagTextActive : null]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching products found</Text>
            <Text style={styles.emptySubtitle}>Try changing category or clearing filters.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => {
                setQuery("");
                setSelectedCategory("all");
                setSelectedTag(null);
              }}
            >
              <Text style={styles.emptyBtnText}>Reset filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => {
              const store = businessesById.get(product.businessId);
              const discount = Number(product.discount || 0);
              const imageUrl = getFirstImageUrl(product.imageUrls);
              const cartItem = cartItems.find((i) => i.productId === product.id);
              const qty = cartItem?.quantity ?? 0;

              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/product",
                      params: { id: product.id, businessId: product.businessId },
                    })
                  }
                >
                  <View style={styles.productThumb}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.productThumbImage} contentFit="cover" />
                    ) : (
                      <View style={styles.productThumbFallback}>
                        <Text style={styles.fallbackEmoji}>🛍️</Text>
                      </View>
                    )}
                    <Text style={discount > 0 ? styles.discountPill : styles.freshPill}>
                      {discount > 0 ? `${discount}% OFF` : "Fresh Pick"}
                    </Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productMeta} numberOfLines={1}>
                    {store?.name ?? "Local Store"}
                  </Text>
                  <View style={styles.productBottom}>
                    <Text style={styles.productPrice}>Rs {product.price}</Text>
                    {qty === 0 ? (
                      <TouchableOpacity
                        style={styles.addCartBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (cartBusinessId && cartBusinessId !== product.businessId) {
                            toast.show("Clears cart from other shop", { type: "warning" });
                          }
                          dispatch(
                            addItem({
                              productId: product.id,
                              productName: product.name,
                              productImage: imageUrl,
                              businessId: product.businessId,
                              businessName: store?.name ?? "Local Store",
                              price: product.price,
                              quantity: 1,
                              maxQuantity: product.stock,
                            })
                          );
                          toast.show(`${product.name} added`, { type: "success" });
                        }}
                      >
                        <Text style={styles.addCartBtnText}>+</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.miniQtyRow}>
                        <TouchableOpacity
                          style={styles.miniQtyBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
                          }}
                        >
                          <Text style={styles.miniQtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.miniQtyCount}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.miniQtyBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (qty >= product.stock) {
                              toast.show(`Only ${product.stock} available`, { type: "warning" });
                              return;
                            }
                            dispatch(updateQuantity({ productId: product.id, quantity: qty + 1 }));
                          }}
                        >
                          <Text style={styles.miniQtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>EXPLORE MORE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionRow}
        >
          {QUICK_ACTIONS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.quickActionCard}
              onPress={() => onQuickAction(item.key)}
            >
              <Text style={styles.quickActionIcon}>{item.icon}</Text>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.businessHeader}>
          <Text style={styles.sectionTitle}>{filteredBusinesses.length} SHOPS DELIVERING TO YOU</Text>
          <TouchableOpacity onPress={() => router.push("/(user)/businesses")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {filteredBusinesses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching shops found</Text>
            <Text style={styles.emptySubtitle}>Try a different search keyword.</Text>
          </View>
        ) : (
          <View style={styles.businessList}>
            {filteredBusinesses.map((business) => (
              <TouchableOpacity
                key={business.id}
                style={styles.businessCard}
                onPress={() => router.push({ pathname: "/(user)/business", params: { id: business.id } })}
              >
                <View style={styles.businessImage}>
                    {business.bannerUrl || business.imageUrl ? (
                      <Image
                        source={{ uri: business.bannerUrl || business.imageUrl || "" }}
                        style={styles.businessImageAsset}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.businessImageFallback}>
                        <Ionicons name="storefront-outline" size={44} color="#D1D5DB" />
                      </View>
                    )}
                    <Text style={styles.businessBadge}>
                      {toTitleCase(String(business.category || "shop"))}
                    </Text>
                </View>
                <View style={styles.businessBody}>
                  <View style={styles.businessTitleRow}>
                    <Text style={styles.businessName}>{business.name}</Text>
                    <Text style={styles.businessRating}>⭐ {Number(business.rating || 0).toFixed(1)}</Text>
                  </View>
                  <Text style={styles.businessMeta} numberOfLines={1}>
                    {business.address}
                  </Text>
                  <Text style={styles.businessEta}>
                    ⚡ {Number(business.metadata?.etaMins ?? 25)}-{Number(business.metadata?.etaMins ?? 25) + 8} mins
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  scrollContent: {
    paddingBottom: 130,
    backgroundColor: "#F7F8FA",
  },
  heroWrap: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 20,
    marginHorizontal: 0,
    shadowColor: "#991B1B",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  locationRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationLeft: {
    flex: 1,
    marginRight: 8,
  },
  locationRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartHeaderBtn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cartHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
  locationTitle: {
    fontSize: 29,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  locationSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#7F1D1D",
  },
  noticeBar: {
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  noticeCta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerCard: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  bannerCarouselRow: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  dynamicBannerCard: {
    width: DYNAMIC_BANNER_WIDTH,
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#111111",
  },
  dynamicBannerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  dynamicBannerOverlay: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dynamicBannerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#F8FAFC",
    textTransform: "uppercase",
  },
  dynamicBannerTitle: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  dynamicBannerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  dynamicBannerCtaWrap: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dynamicBannerCta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  bannerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#DC2626",
  },
  bannerTitle: {
    marginTop: 7,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerMiniRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  bannerMiniTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  bannerMiniTitle: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "700",
  },
  bannerMiniValue: {
    marginTop: 4,
    fontSize: 13,
    color: "#111827",
    fontWeight: "800",
  },
  heroSearchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  heroSearchInput: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "500",
  },
  societyRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  societyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  societyChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  societyLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
  },
  societyLabelActive: {
    color: "#FFFFFF",
  },
  categoryRow: {
    paddingHorizontal: 12,
    paddingTop: 14,
    gap: 10,
  },
  categoryItem: {
    alignItems: "center",
    width: 76,
  },
  categoryIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryIconWrapActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryLabel: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },
  categoryLabelActive: {
    color: "#111827",
  },
  categoryUnderline: {
    marginTop: 6,
    width: 32,
    height: 3,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  tagRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagChipActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  tagText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  tagTextActive: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#7F1D1D",
  },
  productGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  productCard: {
    width: "48.5%",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(127,29,29,0.12)",
    padding: 10,
  },
  productThumb: {
    position: "relative",
    height: 104,
    borderRadius: 12,
    backgroundColor: "#111111",
    overflow: "hidden",
  },
  productThumbImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  productThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  fallbackEmoji: {
    fontSize: 28,
  },
  discountPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#111827",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  freshPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#111111",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  productName: {
    marginTop: 9,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  productMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  productBottom: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  productEta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  addCartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  addCartBtnText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 26,
  },
  miniQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    overflow: "hidden",
  },
  miniQtyBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7F1D1D",
  },
  miniQtyBtnText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  miniQtyCount: {
    width: 26,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  quickActionRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickActionCard: {
    width: 132,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(127,29,29,0.12)",
    paddingVertical: 16,
    alignItems: "center",
  },
  quickActionIcon: {
    fontSize: 28,
  },
  quickActionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  businessHeader: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 16,
  },
  seeAll: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
  businessList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  businessCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(127,29,29,0.12)",
  },
  businessImage: {
    position: "relative",
    height: 176,
    backgroundColor: "#111111",
    overflow: "hidden",
  },
  businessImageAsset: {
    width: "100%",
    height: "100%",
  },
  businessImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  businessBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(17,24,39,0.7)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: "hidden",
  },
  businessBody: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  businessTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  businessName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  businessRating: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
  businessMeta: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  businessEta: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  rowPad: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  skeleton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
  },
  skeletonHeader: {
    height: 30,
    marginHorizontal: 16,
    marginTop: 10,
    width: "48%",
  },
  skeletonSearch: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 10,
  },
  skeletonBanner: {
    height: 160,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
  },
  skeletonTab: {
    width: 72,
    height: 88,
    borderRadius: 14,
  },
  skeletonChip: {
    width: 110,
    height: 36,
    borderRadius: 12,
  },
  skeletonProductImage: {
    height: 104,
    borderRadius: 12,
  },
  skeletonLineLg: {
    marginTop: 10,
    height: 16,
    width: "80%",
  },
  skeletonLineMd: {
    marginTop: 8,
    height: 12,
    width: "52%",
  },
  bottomPad: {
    height: 20,
  },
});
