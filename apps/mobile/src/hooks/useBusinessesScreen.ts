import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect} from "expo-router";
import { useUserApp } from "@hooks/useUserApp";
 
import { Alert } from "react-native";
import { useSocketEvent } from "./useSocket";

/**
 * Encapsulates search + filtering logic for the customer shops list screen.
 */
export const useBusinessesScreen = () => {
  const { businesses, featuredProducts, favoriteBusinessIds, toggleFavorite, initializeHome } = useUserApp();
  const [searchQuery, setSearchQuery] = useState("");
  // Refresh on every focus so suspended/unsuspended changes reflect immediately
  useFocusEffect(
    useCallback(() => {
      initializeHome().catch(() => null);
    }, [initializeHome])
  );

  // Listen for business suspension events via socket (if socket server is configured)
  useSocketEvent<{ businessId: string; status: string; suspensionReason?: string }>(
    "business:suspended",
    (data) => {
      // Refresh the businesses list to hide the suspended business immediately
      initializeHome().catch(() => null);
      
      // Show alert to user if they were viewing this business
      Alert.alert(
        "Business Unavailable",
        data.suspensionReason || "This business is currently unavailable.",
        [{ text: "OK" }]
      );
    }
  );

  // Listen for business status changes (pause/resume)
  useSocketEvent<{ businessId: string; isTakingOrders?: boolean; status?: string }>(
    "business:status",
    () => {
      // Refresh to reflect status changes immediately
      initializeHome().catch(() => null);
    }
  );

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

  const filteredBusinesses = useMemo(() => {
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
  }, [businesses, productMatchesByBusiness, searchQuery]);

  const clearSearch = useCallback(() => setSearchQuery(""), []);
  const openBusiness = useCallback(
    (id: string) => router.push({ pathname: "/(user)/business", params: { id } }),
    []
  );

  return {
    businesses,
    filteredBusinesses,
    productMatchesByBusiness,
    favoriteBusinessIds,
    toggleFavorite,
    searchQuery,
    setSearchQuery,
    clearSearch,
    openBusiness,
  };
};
