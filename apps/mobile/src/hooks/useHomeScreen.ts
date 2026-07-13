import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { router } from "expo-router";
import { useAppSelector } from "@hooks/useRedux";
import { useUserApp } from "@hooks/useUserApp";
import { getBusinessStatus } from "@utils/businessStatus";
import { ORDER_FEES } from "@/constants";
import { Business, Product } from "@/types";
import content from "@/content/home.json";

export function categoryEmoji(category: string) {
  const key = category.toLowerCase();
  if (key.includes("grocery")) return "🛒";
  if (key.includes("pharmacy")) return "💊";
  if (key.includes("restaurant")) return "🍽️";
  if (key.includes("cafe")) return "☕";
  if (key.includes("electronics")) return "📱";
  return "🏬";
}

export function getFirstImage(url?: string) {
  return url && url.trim().length > 0 ? url : null;
}

/**
 * Encapsulates all logic for the user home screen: data initialization,
 * Firestore real-time business sync, search + category filtering,
 * derived store/dish collections, the collapsing header animation,
 * and navigation helpers.
 */
export const useHomeScreen = () => {
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
  const safeFavoriteBusinessIds = Array.isArray(favoriteBusinessIds) ? favoriteBusinessIds : [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const entrance = useState(new Animated.Value(0))[0];

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
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    initializeHome().catch(() => null);
    loadMyOrders().catch(() => null);
  }, [initializeHome, loadMyOrders]);

  const selectedSocietyName =
    safeSocieties.find((society) => society.id === selectedSocietyId)?.name ?? content.defaultSociety;

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
        // Never surface suspended vendors in home screen suggestions
        if ((business as any).suspendedAt) return false;
        if (selectedCategory !== "all" && business.category !== selectedCategory) {
          return false;
        }
        if (!query) return true;
        const matchesStore =
          business.name.toLowerCase().includes(query) ||
          business.category.toLowerCase().includes(query) ||
          business.address.toLowerCase().includes(query);
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
      // Exclude suspended vendors from the "Order Again" carousel
      if (biz && !(biz as any).suspendedAt) result.push(biz);
      if (result.length >= 8) break;
    }
    return result;
  }, [safeOrders, safeBusinesses]);

  const favoriteStores = useMemo(
    () =>
      safeBusinesses.filter(
        (b) => safeFavoriteBusinessIds.includes(b.id) && !(b as any).suspendedAt
      ),
    [safeBusinesses, safeFavoriteBusinessIds]
  );

  const goToBusinesses = useCallback(() => router.push("/(user)/(tabs)/businesses"), []);
  const goToAddresses = useCallback(() => router.push("/(user)/(tabs)/addresses"), []);
  const goToProfile = useCallback(() => router.push("/(user)/profile"), []);
  const goToCart = useCallback(() => router.push("/(user)/cart"), []);
  const goToBusiness = useCallback((id: string) => {
    router.push({ pathname: "/(user)/business", params: { id } });
  }, []);
  const goToDish = useCallback((dish: Product) => {
    router.push({
      pathname: "/(user)/business",
      params: { id: dish.businessId, highlightProductId: dish.id },
    });
  }, []);

  return {
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
    minimumOrder: ORDER_FEES.MINIMUM_ORDER,
    goToBusinesses,
    goToAddresses,
    goToProfile,
    goToCart,
    goToBusiness,
    goToDish,
    getBusinessStatus,
    categoryEmoji,
    getFirstImage,
  };
};
