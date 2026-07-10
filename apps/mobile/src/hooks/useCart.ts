import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { updateQuantity, removeItem, clearCart } from "@store/slices/cartSlice";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import { useRewardedAd } from "@hooks/useRewardedAd";
import { userAppService } from "@services/userAppService";
import { ORDER_FEES } from "@/constants";
import content from "@/content/cart.json";

const { PLATFORM_FEE, MINIMUM_ORDER } = ORDER_FEES;

/**
 * Encapsulates all cart logic: totals, minimum-order gating, quantity edits,
 * rewarded-ad coupon flow, and navigation.
 */
export const useCart = () => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const businesses = useAppSelector((state) => state.userApp.businesses);

  const { isRewardedEnabled, values: ffValues } = useFeatureFlags();
  const { adState, showRewardedAd } = useRewardedAd();
  const [adReward, setAdReward] = useState<{ couponCode: string; discountAmount: number } | null>(
    null
  );

  const storeMin = businesses.find((b) => b.id === cartBusinessId)?.minimumOrderAmount;
  const MIN_ORDER = storeMin && storeMin > 0 ? storeMin : MINIMUM_ORDER;

  const subTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = subTotal + PLATFORM_FEE;
  const canCheckout = cartItems.length > 0 && subTotal >= MIN_ORDER;

  const handleWatchAd = useCallback(async () => {
    const earned = await showRewardedAd();
    if (!earned) return;
    try {
      const reward = await userAppService.claimAdReward();
      setAdReward({ couponCode: reward.couponCode, discountAmount: reward.discountAmount });
    } catch (err: any) {
      Alert.alert(content.alerts.rewardTitle, err?.message ?? content.alerts.rewardError);
    }
  }, [showRewardedAd]);

  const handleIncrease = useCallback(
    (productId: string, current: number, max: number) => {
      if (current >= max) {
        Alert.alert(
          content.alerts.maxStockTitle,
          content.alerts.maxStockMessage.replace("{n}", String(max))
        );
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
    Alert.alert(content.alerts.clearTitle, content.alerts.clearMessage, [
      { text: content.alerts.cancel, style: "cancel" },
      { text: content.alerts.clear, style: "destructive", onPress: () => dispatch(clearCart()) },
    ]);
  }, [dispatch]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/(tabs)/home");
    }
  }, []);

  const goToHome = useCallback(() => router.push("/(user)/home"), []);
  const goToCheckout = useCallback(() => router.push("/(user)/checkout"), []);

  return {
    cartItems,
    subTotal,
    finalAmount,
    canCheckout,
    minOrder: MIN_ORDER,
    isRewardedEnabled,
    ffValues,
    adState,
    adReward,
    handleWatchAd,
    handleIncrease,
    handleDecrease,
    handleRemove,
    handleClearCart,
    goBack,
    goToHome,
    goToCheckout,
  };
};
