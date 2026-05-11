import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useToast } from "react-native-toast-notifications";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useUserApp } from "../../src/hooks/useUserApp";
import { userAppService } from "../../src/services/userAppService";

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
  clothing: "👕",
  electronics: "📱",
  dessert: "🍰",
  snacks: "🍟",
  beverages: "🥤",
};

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
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const {
    societies,
    selectedSocietyId,
    businesses,
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
      <SafeAreaView style={styles.container}>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.heroWrap}>
          <View style={styles.locationRow}>
            <View style={styles.locationLeft}>
              <Text style={styles.locationTitle}>📍 Home</Text>
              <Text style={styles.locationSubtitle} numberOfLines={1}>
                {selectedSocietyName}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push("/(user)/profile")}>
              <Text style={styles.avatarText}>{(user?.firstName || "U").charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {!user?.isPhoneVerified ? (
            <TouchableOpacity style={styles.noticeBar} onPress={() => router.push("/(user)/verify-phone")}>
              <Text style={styles.noticeText}>Verify phone before placing your first order</Text>
              <Text style={styles.noticeCta}>Verify</Text>
            </TouchableOpacity>
          ) : null}

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
        </View>

        <View style={styles.stickySearchWrap}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search products, brands or stores"
                placeholderTextColor="#6B7280"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={onSearchPress}
              />
              {query.trim() ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={onSearchPress}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

        </View>

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
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => {
                    setQuery(product.name);
                    onSearchPress();
                  }}
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
                    <Text style={styles.productEta}>
                      ⚡ {Number(store?.metadata?.etaMins ?? 25)} mins
                    </Text>
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
                onPress={() => router.push("/(user)/businesses")}
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
                        <Text style={styles.businessFallbackEmoji}>🏪</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroWrap: {
    backgroundColor: "#FDECC8",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
  },
  locationRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationLeft: {
    flex: 1,
    marginRight: 8,
  },
  locationTitle: {
    fontSize: 29,
    fontWeight: "800",
    color: "#111827",
  },
  locationSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400E",
  },
  noticeBar: {
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
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
    color: "#9A3412",
  },
  noticeCta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#C2410C",
  },
  bannerCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  bannerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#6D28D9",
  },
  bannerTitle: {
    marginTop: 7,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: "#1F2937",
  },
  bannerMiniRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  bannerMiniTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  stickySearchWrap: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229,231,235,0.95)",
    paddingBottom: 10,
    paddingTop: 10,
  },
  searchRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    fontSize: 20,
    color: "#6B7280",
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  searchClear: {
    fontSize: 12,
    color: "#6B7280",
    paddingHorizontal: 4,
  },
  searchBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
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
    borderColor: "#16A34A",
    backgroundColor: "#ECFDF5",
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
    backgroundColor: "#16A34A",
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
    backgroundColor: "#111827",
    borderColor: "#111827",
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
    color: "#6B7280",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
  },
  productThumb: {
    position: "relative",
    height: 104,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
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
    backgroundColor: "#DBEAFE",
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
    backgroundColor: "#1F2937",
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
  quickActionRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickActionCard: {
    width: 132,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    color: "#16A34A",
  },
  businessList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  businessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  businessImage: {
    position: "relative",
    height: 176,
    backgroundColor: "#FDE68A",
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
    backgroundColor: "#FDE68A",
  },
  businessFallbackEmoji: {
    fontSize: 34,
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
    color: "#166534",
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
    color: "#059669",
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
