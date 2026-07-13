import { useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import { useUserApp } from "@hooks/useUserApp";

/**
 * Encapsulates search + filtering logic for the customer shops list screen,
 * plus Firestore real-time sync of the society's businesses.
 */
export const useBusinessesScreen = () => {
  const {
    businesses,
    featuredProducts,
    favoriteBusinessIds,
    toggleFavorite,
  } = useUserApp();
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

  const filteredBusinesses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return businesses
      .filter((item) => {
        const isSuspended = !!(item as any).suspendedAt;
        // Suspended vendors are excluded from search suggestions but remain
        // visible at the bottom of the unfiltered list with the unavailable badge.
        if (query && isSuspended) return false;
        if (!query) return true;
        const matchesStore =
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.address.toLowerCase().includes(query);

        return matchesStore || productMatchesByBusiness.has(item.id);
      })
      .sort((a, b) => {
        const aIsSuspended = !!(a as any).suspendedAt;
        const bIsSuspended = !!(b as any).suspendedAt;
        // Always push suspended vendors to the bottom
        if (aIsSuspended !== bIsSuspended) return aIsSuspended ? 1 : -1;
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
