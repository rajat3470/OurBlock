import { useCallback, useMemo } from "react";
import { useToast } from "react-native-toast-notifications";
import { useAppAlert } from "@/components/ui/AppAlertProvider";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { updateQuantity, removeItem, clearCart } from "@store/slices/cartSlice";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import { getBusinessStatus } from "@utils/businessStatus";
import { ORDER_FEES } from "@/constants";
import content from "@/content/cart.json";

const { PLATFORM_FEE: DEFAULT_PLATFORM_FEE, MINIMUM_ORDER: DEFAULT_MINIMUM_ORDER } = ORDER_FEES;

/**
 * Encapsulates all cart logic: totals, minimum-order gating, quantity edits,
 * rewarded-ad coupon flow, and navigation.
 */
export const useCart = () => {
  const toast = useToast();
  const showAlert = useAppAlert();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const businesses = useAppSelector((state) => state.userApp.businesses);

  const { values: ffValues } = useFeatureFlags();

  const cartBusiness = useMemo(
    () => businesses.find((b) => b.id === cartBusinessId) ?? null,
    [businesses, cartBusinessId]
  );
  const businessStatus = cartBusiness ? getBusinessStatus(cartBusiness) : "open";
  const isStoreOpen = businessStatus === "open";

  const PLATFORM_FEE = ffValues.platformFeeAmount ?? DEFAULT_PLATFORM_FEE;
  const MINIMUM_ORDER = ffValues.minimumOrderAmount ?? DEFAULT_MINIMUM_ORDER;

  const storeMin = cartBusiness?.minimumOrderAmount;
  const MIN_ORDER = storeMin && storeMin > 0 ? storeMin : MINIMUM_ORDER;

  const subTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = subTotal + PLATFORM_FEE;
  const canCheckout = cartItems.length > 0 && isStoreOpen && subTotal >= MIN_ORDER;

  const handleIncrease = useCallback(
    (productId: string, current: number, max: number) => {
      if (current >= max) {
        showAlert({
          title: content.alerts.maxStockTitle,
          message: content.alerts.maxStockMessage.replace("{n}", String(max)),
          variant: "warning",
        });
        return;
      }
      dispatch(updateQuantity({ productId, quantity: current + 1 }));
    },
    [dispatch]
  );

  const handleDecrease = useCallback(
    (productId: string, current: number) => {
      dispatch(updateQuantity({ productId, quantity: current - 1 }));
    },
    [dispatch]
  );

  const handleRemove = useCallback(
    (productId: string) => {
      dispatch(removeItem(productId));
    },
    [dispatch]
  );

  const handleClearCart = useCallback(() => {
    showAlert({
      title: content.alerts.clearTitle,
      message: content.alerts.clearMessage,
      variant: "destructive",
      buttons: [
        { text: content.alerts.cancel, style: "cancel" },
        { text: content.alerts.clear, style: "destructive", onPress: () => { dispatch(clearCart()); } },
      ],
    });
  }, [dispatch, showAlert]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/(tabs)/home");
    }
  }, []);

  const goToHome = useCallback(() => router.push("/(user)/home"), []);
  const goToShop = useCallback(() => {
    if (cartBusinessId) {
      router.push({ pathname: "/(user)/business", params: { id: cartBusinessId } });
    }
  }, [cartBusinessId]);
  const user = useAppSelector((state) => state.auth.user);

  const goToCheckout = useCallback(() => {
    if (!isStoreOpen) {
      toast.show("This store is currently not accepting orders", { type: "warning" });
      return;
    }
    if (!user?.firstName) {
      router.push({ pathname: "/(user)/complete-profile", params: { next: "checkout" } });
      return;
    }
    router.push("/(user)/checkout");
  }, [isStoreOpen, toast, user]);

  return {
    cartItems,
    subTotal,
    finalAmount,
    canCheckout,
    minOrder: MIN_ORDER,
    businessStatus,
    isStoreOpen,
    adsEnabled: ffValues.adsEnabled,
    handleIncrease,
    handleDecrease,
    handleRemove,
    handleClearCart,
    goBack,
    goToHome,
    goToShop,
    goToCheckout,
  };
};
