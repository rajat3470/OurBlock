import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { updateQuantity, removeItem, clearCart } from "../../src/store/slices/cartSlice";
import { ORDER_FEES } from "../../src/constants";
import { displayQuantity } from "../../src/utils/helpers";
import { useFeatureFlags } from "../../src/hooks/useFeatureFlags";
import { useRewardedAd } from "../../src/hooks/useRewardedAd";
import { userAppService } from "../../src/services/userAppService";

const { PLATFORM_FEE, MINIMUM_ORDER } = ORDER_FEES;

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const insets = useSafeAreaInsets();

  const { isRewardedEnabled, values: ffValues } = useFeatureFlags();
  const { adState, showRewardedAd } = useRewardedAd();
  const [adReward, setAdReward] = useState<{ couponCode: string; discountAmount: number } | null>(null);

  const subTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = subTotal + PLATFORM_FEE;
  const canCheckout = cartItems.length > 0 && subTotal >= MINIMUM_ORDER;

  async function handleWatchAd() {
    const earned = await showRewardedAd();
    if (!earned) return;
    try {
      const reward = await userAppService.claimAdReward();
      setAdReward({ couponCode: reward.couponCode, discountAmount: reward.discountAmount });
    } catch (err: any) {
      Alert.alert("Reward", err?.message ?? "Could not issue reward. Try again later.");
    }
  }

  function handleIncrease(productId: string, current: number, max: number) {
    if (current >= max) {
      Alert.alert("Max stock reached", `Only ${max} units available`);
      return;
    }
    dispatch(updateQuantity({ productId, quantity: current + 1 }));
  }

  function handleDecrease(productId: string, current: number) {
    dispatch(updateQuantity({ productId, quantity: current - 1 }));
  }

  function handleRemove(productId: string) {
    dispatch(removeItem(productId));
  }

  function handleClearCart() {
    Alert.alert("Clear Cart", "Remove all items from cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => dispatch(clearCart()) },
    ]);
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#DC2626", "#991B1B"]}
        style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </LinearGradient>

      {cartItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Browse products on the home screen and add items to your cart.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(user)/home") }>
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.shopRow}>
              <View style={styles.shopLabelWrap}>
                <Ionicons name="storefront-outline" size={18} color="#DC2626" />
                <Text style={styles.shopLabel}>{cartItems[0]?.businessName ?? "Shop"}</Text>
              </View>
            </View>

            {cartItems.map((item) => (
              <View key={item.productId} style={styles.itemCard}>
                <View style={styles.itemImageWrap}>
                  {item.productImage ? (
                    <Image source={{ uri: item.productImage }} style={styles.itemImage} contentFit="cover" />
                  ) : (
                    <View style={styles.itemImageFallback}>
                      <Ionicons name="bag-outline" size={28} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>Rs {item.price} × {displayQuantity(item.quantity, item.unit, item.unitStep)}</Text>
                  <Text style={styles.itemLineTotal}>Rs {item.price * item.quantity}</Text>
                </View>
                <View style={styles.itemActions}>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecrease(item.productId, item.quantity)}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyCount}>{displayQuantity(item.quantity, item.unit, item.unitStep)}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncrease(item.productId, item.quantity, item.maxQuantity)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(item.productId)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {subTotal < MINIMUM_ORDER ? (
              <View style={styles.minOrderWarn}>
                <Ionicons name="information-circle-outline" size={14} color="#991B1B" />
                <Text style={styles.minOrderWarnText}>Add Rs {MINIMUM_ORDER - subTotal} more to reach the Rs {MINIMUM_ORDER} minimum.</Text>
              </View>
            ) : null}

            {isRewardedEnabled && !adReward && (
              <TouchableOpacity
                style={styles.adRewardBanner}
                onPress={handleWatchAd}
                disabled={adState === "loading" || adState === "showing"}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#FEF3C7", "#FDE68A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adRewardGradient}
                >
                  <View style={styles.adRewardIconWrap}>
                    <Ionicons name="play-circle-outline" size={26} color="#92400E" />
                  </View>
                  <View style={styles.adRewardTextWrap}>
                    <Text style={styles.adRewardTitle}>Watch an ad, save Rs {ffValues.adsRewardedMinRs}–{ffValues.adsRewardedMaxRs}</Text>
                    <Text style={styles.adRewardSub}>Earn a coupon for your next order</Text>
                  </View>
                  {adState === "loading" ? (
                    <ActivityIndicator size="small" color="#92400E" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#92400E" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {adReward && (
              <View style={styles.adRewardEarned}>
                <Ionicons name="checkmark-circle" size={22} color="#15803D" />
                <View style={styles.adRewardEarnedText}>
                  <Text style={styles.adRewardEarnedTitle}>Coupon earned! Save Rs {adReward.discountAmount}</Text>
                  <Text style={styles.adRewardEarnedCode}>Use code <Text style={styles.adRewardCode}>{adReward.couponCode}</Text> at checkout</Text>
                </View>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.bottomCta}>
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>Rs {finalAmount}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, !canCheckout ? styles.checkoutBtnDisabled : null]}
                disabled={!canCheckout}
                onPress={() => router.push("/(user)/checkout")}
              >
                <Text style={styles.checkoutText}>Proceed to Checkout →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  clearText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626" },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  browseBtn: { marginTop: 8, backgroundColor: "#DC2626", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { fontWeight: "800", color: "#FFFFFF", fontSize: 15 },
  scroll: { paddingBottom: 200 },
  shopRow: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0", marginBottom: 4 },
  shopLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  shopLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  itemCard: { flexDirection: "row", backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 12, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  itemImageWrap: { width: 72, height: 72, borderRadius: 10, overflow: "hidden", backgroundColor: "#F3F4F6" },
  itemImage: { width: 72, height: 72 },
  itemImageFallback: { width: 72, height: 72, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626", borderRadius: 10 },
  itemDetails: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemPrice: { fontSize: 12, color: "#6B7280" },
  itemLineTotal: { fontSize: 15, fontWeight: "800", color: "#DC2626" },
  itemActions: { alignItems: "flex-end", gap: 8 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.18)", overflow: "hidden" },
  qtyBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626" },
  qtyBtnText: { fontSize: 18, color: "#FFFFFF", fontWeight: "700" },
  qtyCount: { width: 32, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#991B1B" },
  removeBtn: { paddingHorizontal: 4 },
  removeText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  minOrderWarn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 0, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  minOrderWarnText: { fontSize: 12, fontWeight: "600", color: "#991B1B", flex: 1 },
  bottomCta: { position: "absolute", bottom: 104, left: 16, right: 16, backgroundColor: "#FFFFFF", padding: 16, borderRadius: 20, shadowColor: "#DC2626", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 12, color: "#6B7280" },
  totalAmount: { fontSize: 18, fontWeight: "800", color: "#111827" },
  checkoutBtn: { backgroundColor: "#DC2626", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  checkoutBtnDisabled: { backgroundColor: "#D1D5DB" },
  checkoutText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  adRewardBanner: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(180,130,0,0.2)" },
  adRewardGradient: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  adRewardIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(146,64,14,0.1)", alignItems: "center", justifyContent: "center" },
  adRewardTextWrap: { flex: 1 },
  adRewardTitle: { fontSize: 13, fontWeight: "700", color: "#78350F" },
  adRewardSub: { fontSize: 11, color: "#92400E", marginTop: 2 },
  adRewardEarned: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: "#F0FDF4", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#BBF7D0" },
  adRewardEarnedText: { flex: 1 },
  adRewardEarnedTitle: { fontSize: 13, fontWeight: "700", color: "#15803D" },
  adRewardEarnedCode: { fontSize: 12, color: "#166534", marginTop: 2 },
  adRewardCode: { fontWeight: "800", letterSpacing: 0.5 },
});
