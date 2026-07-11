import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, SectionList } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { useUserApp } from "@hooks/useUserApp";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import { subscribeToBusiness } from "@services/businessSyncService";
import { userAppService } from "@services/userAppService";
import { addItem, clearCart, updateQuantity } from "@store/slices/cartSlice";
import { patchBusiness } from "@store/slices/userAppSlice";
import { Business, Product, ProductAttribute } from "@/types";
import { unitStepLabel, displayQuantity, maxCartSteps } from "@utils/helpers";
import { getBusinessStatus } from "@utils/businessStatus";
import { ORDER_FEES } from "@/constants";
import content from "@/content/business.json";

export type DietFilter = "all" | "veg" | "nonveg" | "bestseller";
export type MenuSection = { title: string; data: Product[] };

const BESTSELLER_RE = /bestseller|recommended|popular/i;

export function getFirstImageUrl(images?: string[]) {
  return images?.find((url) => typeof url === "string" && url.trim().length > 0) ?? null;
}

export function isBestsellerProduct(product: Product) {
  return (product.tags ?? []).some((tag) => BESTSELLER_RE.test(tag));
}

export function groupAttributes(attributes?: ProductAttribute[]) {
  const map = new Map<string, string[]>();
  (attributes ?? []).forEach((attr) => {
    const values = map.get(attr.name) ?? [];
    if (!values.includes(attr.value)) values.push(attr.value);
    map.set(attr.name, values);
  });
  return Array.from(map.entries()).map(([name, values]) => ({ name, values }));
}

/**
 * Encapsulates all logic for the business (shop) detail screen: product
 * loading, real-time pause/resume, diet filtering, section grouping,
 * customization modal state, and cart interactions.
 */
export const useBusinessDetail = () => {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { id: businessId, highlightProductId } = useLocalSearchParams<{
    id: string;
    highlightProductId?: string;
  }>();
  const listRef = useRef<SectionList<Product, MenuSection>>(null);

  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);

  const { businesses } = useUserApp();
  const { isNativeListingEnabled } = useFeatureFlags();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [highlightId, setHighlightId] = useState<string | null>(highlightProductId ?? null);
  const [customizeProduct, setCustomizeProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [customizeQty, setCustomizeQty] = useState(1);

  const bizOrderStatus = business ? getBusinessStatus(business) : "open";
  const isOrderable = bizOrderStatus === "open";

  useEffect(() => {
    if (!businessId) return;
    return subscribeToBusiness(businessId, (updated) => {
      dispatch(patchBusiness({ ...updated } as Partial<Business> & { id: string }));
      setBusiness(updated);
    });
  }, [businessId, dispatch]);

  const minOrder =
    business?.minimumOrderAmount && business.minimumOrderAmount > 0
      ? business.minimumOrderAmount
      : ORDER_FEES.MINIMUM_ORDER;

  const bizCartItems = useMemo(
    () => cartItems.filter((i) => i.businessId === businessId),
    [cartItems, businessId]
  );
  const bizCartCount = bizCartItems.reduce((acc, i) => acc + i.quantity, 0);
  const bizSubtotal = bizCartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const hasVeg = useMemo(() => products.some((p) => p.isVeg === true), [products]);
  const hasNonVeg = useMemo(() => products.some((p) => p.isVeg === false), [products]);
  const hasBestseller = useMemo(() => products.some(isBestsellerProduct), [products]);

  const filteredProducts = useMemo(() => {
    if (dietFilter === "veg") return products.filter((p) => p.isVeg === true);
    if (dietFilter === "nonveg") return products.filter((p) => p.isVeg === false);
    if (dietFilter === "bestseller") return products.filter(isBestsellerProduct);
    return products;
  }, [products, dietFilter]);

  const sections = useMemo<MenuSection[]>(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach((p) => {
      const key =
        (p.menuSection && p.menuSection.trim()) ||
        (p.category && p.category.trim()) ||
        content.defaultSection;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredProducts]);

  useEffect(() => {
    setHighlightId(highlightProductId ?? null);
  }, [highlightProductId]);

  useEffect(() => {
    if (!highlightId || sections.length === 0) return;
    let sectionIndex = -1;
    let itemIndex = -1;
    for (let s = 0; s < sections.length; s += 1) {
      const idx = sections[s].data.findIndex((p) => p.id === highlightId);
      if (idx >= 0) {
        sectionIndex = s;
        itemIndex = idx;
        break;
      }
    }
    if (sectionIndex < 0) return;
    const scrollTimer = setTimeout(() => {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex,
        viewPosition: 0.35,
        animated: true,
      });
    }, 350);
    const clearTimer = setTimeout(() => setHighlightId(null), 3200);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightId, sections]);

  const loadProducts = useCallback(() => {
    if (!businessId) return;
    setIsLoading(true);
    setError(null);
    userAppService
      .getProductsByBusiness(businessId)
      .then((data) => {
        setProducts(data);
      })
      .catch(() => {
        setError(content.states.loadError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const localBiz = businesses.find((b) => b.id === businessId);
    if (localBiz) setBusiness(localBiz);
    loadProducts();
  }, [businessId]);

  const openCustomize = useCallback((product: Product) => {
    const groups = groupAttributes(product.attributes);
    const initial: Record<string, string> = {};
    groups.forEach((group) => {
      initial[group.name] = group.values[0];
    });
    setSelectedOptions(initial);
    setCustomizeQty(1);
    setCustomizeProduct(product);
  }, []);

  const commitCustomize = useCallback(() => {
    const product = customizeProduct;
    if (!product) return;
    const imageUrl = getFirstImageUrl(product.imageUrls);
    const maxSteps = maxCartSteps(product.stock, product.unit, product.unitStep);
    const selectedAttributes = Object.entries(selectedOptions).map(([name, value]) => ({
      name,
      value,
    }));
    const run = () => {
      dispatch(
        addItem({
          productId: product.id,
          productName: product.name,
          productImage: imageUrl,
          businessId: product.businessId,
          businessName: business?.name ?? content.defaultCartBusinessName,
          price: product.price,
          quantity: customizeQty,
          maxQuantity: maxSteps,
          unit: product.unit,
          unitStep: product.unitStep,
          selectedAttributes: selectedAttributes.length ? selectedAttributes : undefined,
        })
      );
      toast.show(`${product.name}${content.toasts.addedSuffix}`, { type: "success" });
      setCustomizeProduct(null);
    };
    if (cartBusinessId && cartBusinessId !== product.businessId) {
      Alert.alert(content.replaceCart.title, content.replaceCart.message, [
        { text: content.replaceCart.cancel, style: "cancel" },
        {
          text: content.replaceCart.confirm,
          style: "destructive",
          onPress: () => {
            dispatch(clearCart());
            run();
          },
        },
      ]);
      return;
    }
    run();
  }, [business, cartBusinessId, customizeProduct, customizeQty, dispatch, selectedOptions, toast]);

  const addProductToCart = useCallback(
    (product: Product) => {
      dispatch(
        addItem({
          productId: product.id,
          productName: product.name,
          productImage: getFirstImageUrl(product.imageUrls),
          businessId: product.businessId,
          businessName: business?.name ?? content.defaultCartBusinessName,
          price: product.price,
          quantity: 1,
          maxQuantity: maxCartSteps(product.stock, product.unit, product.unitStep),
          unit: product.unit,
          unitStep: product.unitStep,
        })
      );
      toast.show(`${product.name}${content.toasts.addedSuffix}`, { type: "success" });
    },
    [business, dispatch, toast]
  );

  const handleAddPress = useCallback(
    (product: Product) => {
      if (cartBusinessId && cartBusinessId !== product.businessId) {
        Alert.alert(content.replaceCart.title, content.replaceCart.message, [
          { text: content.replaceCart.cancel, style: "cancel" },
          {
            text: content.replaceCart.confirm,
            style: "destructive",
            onPress: () => {
              dispatch(clearCart());
              addProductToCart(product);
            },
          },
        ]);
        return;
      }
      addProductToCart(product);
    },
    [addProductToCart, cartBusinessId, dispatch]
  );

  const decreaseQty = useCallback(
    (product: Product, qty: number) => {
      dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
    },
    [dispatch]
  );

  const increaseQty = useCallback(
    (product: Product, qty: number, maxSteps: number) => {
      if (qty >= maxSteps) {
        toast.show(
          product.unit && product.unit !== "piece"
            ? `${content.toasts.onlyAvailablePrefix}${product.stock}${product.unit}${content.toasts.onlyAvailableSuffix}`
            : `${content.toasts.onlyAvailablePrefix}${product.stock}${content.toasts.onlyAvailableSuffix}`,
          { type: "warning" }
        );
        return;
      }
      dispatch(updateQuantity({ productId: product.id, quantity: qty + 1 }));
    },
    [dispatch, toast]
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/(tabs)/businesses");
    }
  }, []);

  const goToCart = useCallback(() => router.push("/(user)/cart"), []);

  const goToProduct = useCallback((product: Product) => {
    router.push({
      pathname: "/(user)/product",
      params: { id: product.id, businessId: product.businessId },
    });
  }, []);

  return {
    listRef,
    cartItems,
    business,
    products,
    isLoading,
    error,
    dietFilter,
    setDietFilter,
    highlightId,
    customizeProduct,
    setCustomizeProduct,
    selectedOptions,
    setSelectedOptions,
    customizeQty,
    setCustomizeQty,
    bizOrderStatus,
    isOrderable,
    minOrder,
    bizCartCount,
    bizSubtotal,
    hasVeg,
    hasNonVeg,
    hasBestseller,
    sections,
    isNativeListingEnabled,
    openCustomize,
    commitCustomize,
    addProductToCart,
    handleAddPress,
    decreaseQty,
    increaseQty,
    loadProducts,
    goBack,
    goToCart,
    goToProduct,
    displayQuantity,
    unitStepLabel,
    maxCartSteps,
    isBestsellerProduct,
    groupAttributes,
    getFirstImageUrl,
  };
};
