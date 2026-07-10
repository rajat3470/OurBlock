import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { addItem, clearCart, updateQuantity } from "@store/slices/cartSlice";
import { userAppService } from "@services/userAppService";
import { Product } from "@/types";
import { unitStepLabel, displayQuantity, maxCartSteps, stockBadgeInfo } from "@utils/helpers";
import { getBusinessStatus } from "@utils/businessStatus";
import content from "@/content/product.json";

function getFirstImageUrl(images?: string[]) {
  return images?.find((url) => typeof url === "string" && url.trim().length > 0) ?? null;
}

/**
 * Encapsulates all logic for the product detail screen: product/business
 * resolution, cart interactions, quantity controls, and derived display state.
 */
export const useProductDetail = () => {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { id: productId, businessId: paramBizId } = useLocalSearchParams<{
    id: string;
    businessId?: string;
  }>();

  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const featuredProducts = useAppSelector((state) => state.userApp.featuredProducts);
  const businesses = useAppSelector((state) => state.userApp.businesses);

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!productId) return;

    const localProduct = featuredProducts.find((p) => p.id === productId);

    if (localProduct) {
      setProduct(localProduct);
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        await Promise.all([userAppService.getFeaturedProducts("")]);
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, featuredProducts, businesses, paramBizId]);

  const business = useMemo(
    () => businesses.find((b) => b.id === (product?.businessId ?? paramBizId)) ?? null,
    [businesses, product?.businessId, paramBizId]
  );

  const cartItem = cartItems.find((i) => i.productId === productId);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const qty = cartItem?.quantity ?? 0;
  const bizOrderStatus = business ? getBusinessStatus(business) : "open";
  const isOrderable = bizOrderStatus === "open";

  const maxSteps = product ? maxCartSteps(product.stock, product.unit, product.unitStep) : 0;
  const uLabel = product ? unitStepLabel(product.unit, product.unitStep) : "";

  const addCurrentProductToCart = useCallback(
    (targetProduct: Product) => {
      dispatch(
        addItem({
          productId: targetProduct.id,
          productName: targetProduct.name,
          productImage: getFirstImageUrl(targetProduct.imageUrls),
          businessId: targetProduct.businessId,
          businessName: business?.name ?? content.defaultBusinessName,
          price: targetProduct.price,
          quantity: 1,
          maxQuantity: maxCartSteps(targetProduct.stock, targetProduct.unit, targetProduct.unitStep),
          unit: targetProduct.unit,
          unitStep: targetProduct.unitStep,
        })
      );
      toast.show(`${targetProduct.name}${content.toasts.addedSuffix}`, { type: "success" });
    },
    [business, dispatch, toast]
  );

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (cartBusinessId && cartBusinessId !== product.businessId) {
      Alert.alert(content.replaceCart.title, content.replaceCart.message, [
        { text: content.replaceCart.cancel, style: "cancel" },
        {
          text: content.replaceCart.confirm,
          style: "destructive",
          onPress: () => {
            dispatch(clearCart());
            addCurrentProductToCart(product);
          },
        },
      ]);
      return;
    }

    addCurrentProductToCart(product);
  }, [addCurrentProductToCart, cartBusinessId, dispatch, product]);

  const handleIncrease = useCallback(() => {
    if (!product || !cartItem) return;
    if (cartItem.quantity >= maxSteps) {
      const stockLabel = uLabel ? `${product.stock}${product.unit}` : `${product.stock}`;
      toast.show(`${content.toasts.onlyStockPrefix}${stockLabel}${content.toasts.onlyStockSuffix}`, { type: "warning" });
      return;
    }
    dispatch(updateQuantity({ productId: product.id, quantity: cartItem.quantity + 1 }));
  }, [cartItem, dispatch, maxSteps, product, toast, uLabel]);

  const handleDecrease = useCallback(() => {
    if (!product) return;
    dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
  }, [dispatch, product, qty]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/(tabs)/home");
    }
  }, []);

  const goToCart = useCallback(() => router.push("/(user)/cart"), []);

  return {
    product,
    business,
    isLoading,
    selectedImageIndex,
    setSelectedImageIndex,
    cartCount,
    cartTotal,
    qty,
    bizOrderStatus,
    isOrderable,
    maxSteps,
    uLabel,
    handleAddToCart,
    handleIncrease,
    handleDecrease,
    goBack,
    goToCart,
    displayQuantity,
    stockBadgeInfo,
  };
};
