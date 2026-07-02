import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useUserApp } from "../../src/hooks/useUserApp";
import { userAppService } from "../../src/services/userAppService";
import { Address } from "../../src/types";
import { ORDER_FEES } from "../../src/constants";
import { displayQuantity } from "../../src/utils/helpers";

const { PLATFORM_FEE, MINIMUM_ORDER } = ORDER_FEES;

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash on Delivery", icon: "💵" },
  { key: "upi", label: "UPI", icon: "📱" },
];

export default function CheckoutScreen() {
  const toast = useToast();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const { placeOrder, isLoading, businesses } = useUserApp();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const insets = useSafeAreaInsets();
  // Tracks when an order has just been placed so the empty-cart
  // useEffect does not race against the explicit router.replace call.
  const orderPlacedRef = useRef(false);

  const subTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const finalAmount = subTotal + PLATFORM_FEE - discountAmount;

  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const data = await userAppService.getAddresses();
      setAddresses(data);
      const def = data.find((a) => a.isDefault) ?? data[0];
      if (def) setSelectedAddressId(def.id);
    } catch {
      toast.show("Failed to load addresses", { type: "danger" });
    } finally {
      setLoadingAddresses(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Redirect back if cart is empty (but not right after placing an order)
  useEffect(() => {
    if (cartItems.length === 0 && !orderPlacedRef.current) {
      router.replace("/(user)/home");
    }
  }, [cartItems]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) {
      toast.show("Enter a coupon code", { type: "warning" });
      return;
    }
    if (!cartBusinessId) return;
    setCouponLoading(true);
    try {
      const result = await userAppService.validateCoupon({
        code: couponCode.trim(),
        businessId: cartBusinessId,
        subTotal,
      });
      setAppliedCoupon({ code: result.code, discountAmount: result.discountAmount });
      toast.show(`Coupon applied! You save Rs ${result.discountAmount}`, { type: "success" });
    } catch (e: any) {
      setAppliedCoupon(null);
      toast.show(e?.message ?? "Invalid coupon", { type: "danger" });
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      toast.show("Please select a delivery address", { type: "warning" });
      return;
    }
    if (!cartBusinessId) {
      toast.show("Cart is empty", { type: "warning" });
      return;
    }
    const storeMin = businesses.find((b) => b.id === cartBusinessId)?.minimumOrderAmount;
    const minOrder = storeMin && storeMin > 0 ? storeMin : MINIMUM_ORDER;
    if (subTotal < minOrder) {
      toast.show(`Minimum order is Rs ${minOrder}`, { type: "warning" });
      return;
    }

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.show("Selected address not found", { type: "danger" });
      return;
    }

    Alert.alert(
      "Place Order",
      `Total: Rs ${finalAmount}\nPayment: ${paymentMethod === "cash" ? "Cash on Delivery" : "UPI"}\n\nConfirm order?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const payload = {
                businessId: cartBusinessId,
                items: cartItems.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                })),
                deliveryAddress: {
                  type: selectedAddress.type,
                  name: selectedAddress.name,
                  street: selectedAddress.street,
                  landmark: selectedAddress.landmark,
                  city: selectedAddress.city,
                  state: selectedAddress.state,
                  pincode: selectedAddress.pincode,
                  phone: selectedAddress.phone,
                  isDefault: selectedAddress.isDefault,
                },
                paymentMethod,
                couponCode: appliedCoupon?.code,
              };

              // Set flag BEFORE placeOrder so the empty-cart useEffect
              // does not fire router.replace("/(user)/home") while we
              // are already navigating to orders — double navigation crashes iOS.
              orderPlacedRef.current = true;
              await placeOrder(payload);
              toast.show("🎉 Order placed successfully!", { type: "success", duration: 3000 });
              router.replace("/(user)/orders");
            } catch (err: any) {
              const message =
                err?.response?.data?.error ??
                err?.message ??
                "Failed to place order";
              toast.show(message, { type: "danger" });
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#DC2626", "#991B1B"]}
        style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(user)/cart");
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Order Items Summary */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>
            {cartItems[0]?.businessName ?? "Your Order"}
          </Text>
          {cartItems.map((item) => (
            <View key={item.productId} style={styles.orderItemRow}>
              <View style={styles.orderItemQty}>
                <Text style={styles.orderItemQtyText}>{displayQuantity(item.quantity, item.unit, item.unitStep)}</Text>
              </View>
              <Text style={styles.orderItemName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.orderItemPrice}>
                Rs {item.price * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => router.push("/(user)/add-address")}>
              <Text style={styles.addLink}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator size="small" color="#D97706" style={{ marginTop: 12 }} />
          ) : addresses.length === 0 ? (
            <View style={styles.noAddressWrap}>
              <Text style={styles.noAddressText}>No saved addresses found.</Text>
              <TouchableOpacity
                style={styles.addAddressBtn}
                onPress={() => router.push("/(user)/add-address")}
              >
                <Text style={styles.addAddressBtnText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((address) => {
              const selected = address.id === selectedAddressId;
              return (
                <TouchableOpacity
                  key={address.id}
                  style={[styles.addressCard, selected ? styles.addressCardActive : null]}
                  onPress={() => setSelectedAddressId(address.id)}
                >
                  <View style={styles.addressRadio}>
                    <View
                      style={[
                        styles.radioCircle,
                        selected ? styles.radioCircleActive : null,
                      ]}
                    />
                  </View>
                  <View style={styles.addressBody}>
                    <View style={styles.addressTitleRow}>
                      <Text style={styles.addressType}>
                        {address.type === "home"
                          ? "Home"
                          : address.type === "work"
                          ? "🏢"
                          : "📌"}{" "}
                        {address.name ?? address.type}
                      </Text>
                      {address.isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.addressLine}>
                      {address.street}
                      {address.landmark ? `, ${address.landmark}` : ""}
                    </Text>
                    <Text style={styles.addressLine}>
                      {address.city}, {address.state} - {address.pincode}
                    </Text>
                    <Text style={styles.addressPhone}>📞 {address.phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.key;
            return (
              <TouchableOpacity
                key={method.key}
                style={[styles.paymentCard, selected ? styles.paymentCardActive : null]}
                onPress={() => setPaymentMethod(method.key as "cash" | "upi")}
              >
                <View style={styles.addressRadio}>
                  <View
                    style={[
                      styles.radioCircle,
                      selected ? styles.radioCircleActive : null,
                    ]}
                  />
                </View>
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                {method.key === "upi" ? (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Coupon / Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎟️ Promo Code</Text>
          {appliedCoupon ? (
            <View style={styles.couponApplied}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedCode}>{appliedCoupon.code}</Text>
                <Text style={styles.couponAppliedSavings}>
                  You save Rs {appliedCoupon.discountAmount}!
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} style={styles.couponRemoveBtn}>
                <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
                <Text style={styles.couponRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Enter promo code"
                placeholderTextColor="#9CA3AF"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleApplyCoupon}
              />
              <TouchableOpacity
                style={[styles.couponApplyBtn, couponLoading && styles.couponApplyBtnDisabled]}
                onPress={handleApplyCoupon}
                disabled={couponLoading}
              >
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.couponApplyBtnText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bill details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal ({cartItems.length} items)</Text>
            <Text style={styles.billValue}>Rs {subTotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Fee</Text>
            <Text style={styles.billValue}>Rs {PLATFORM_FEE}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValueGreen}>FREE</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST / Tax</Text>
            <Text style={styles.billValueGreen}>None</Text>
          </View>
          {discountAmount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Promo ({appliedCoupon?.code})</Text>
              <Text style={styles.billValueGreen}>- Rs {discountAmount}</Text>
            </View>
          ) : null}
          <View style={styles.billDivider} />
          <View style={styles.billRow}>
            <Text style={styles.billLabelBold}>Total Amount</Text>
            <Text style={styles.billValueBold}>Rs {finalAmount}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order CTA */}
      <View style={styles.bottomCta}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.ctaTotalLabel}>Total{discountAmount > 0 ? ` (Saved Rs ${discountAmount})` : ""}</Text>
            <Text style={styles.ctaTotalAmount}>Rs {finalAmount}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.placeOrderBtn,
              (isLoading || !selectedAddressId) ? styles.placeOrderBtnDisabled : null,
            ]}
            disabled={isLoading || !selectedAddressId}
            onPress={handlePlaceOrder}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  headerRight: { width: 36 },
  scroll: { paddingBottom: 32 },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  addLink: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  orderItemQty: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: "center",
  },
  orderItemQtyText: { fontSize: 12, fontWeight: "800", color: "#92400E" },
  orderItemName: { flex: 1, fontSize: 13, color: "#374151", fontWeight: "600" },
  orderItemPrice: { fontSize: 13, fontWeight: "700", color: "#111827" },
  noAddressWrap: { alignItems: "center", paddingVertical: 16, gap: 12 },
  noAddressText: { fontSize: 14, color: "#6B7280" },
  addAddressBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addAddressBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  addressCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  addressCardActive: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  addressRadio: {
    paddingTop: 2,
    width: 20,
    alignItems: "center",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  radioCircleActive: { borderColor: "#DC2626", backgroundColor: "#DC2626" },
  addressBody: { flex: 1, gap: 3 },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  addressType: { fontSize: 14, fontWeight: "700", color: "#111827" },
  defaultBadge: {
    backgroundColor: "#C6F7E2",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "800", color: "#065F46" },
  addressLine: { fontSize: 13, color: "#4B5563", lineHeight: 18 },
  addressPhone: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  paymentCardActive: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  paymentIcon: { fontSize: 22 },
  paymentLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  comingSoonBadge: {
    backgroundColor: "#EDE9FE",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: { fontSize: 10, fontWeight: "700", color: "#6D28D9" },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  billLabel: { fontSize: 13, color: "#4B5563" },
  billValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
  billValueGreen: { fontSize: 13, fontWeight: "700", color: "#059669" },
  billDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 6 },
  billLabelBold: { fontSize: 15, fontWeight: "800", color: "#111827" },
  billValueBold: { fontSize: 15, fontWeight: "800", color: "#DC2626" },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaTotalLabel: { fontSize: 12, color: "#6B7280" },
  ctaTotalAmount: { fontSize: 20, fontWeight: "800", color: "#111827" },
  placeOrderBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 160,
    alignItems: "center",
  },
  placeOrderBtnDisabled: { backgroundColor: "#D1D5DB" },
  placeOrderText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  couponRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  couponInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#FAFAFA",
    letterSpacing: 1,
  },
  couponApplyBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  couponApplyBtnDisabled: { backgroundColor: "#D1D5DB" },
  couponApplyBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  couponApplied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  couponAppliedCode: { fontSize: 13, fontWeight: "800", color: "#059669" },
  couponAppliedSavings: { fontSize: 11, color: "#047857", fontWeight: "600", marginTop: 1 },
  couponRemoveBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  couponRemoveText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
});
