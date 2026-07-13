import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { displayQuantity } from "@utils/helpers";
import { useCheckout, PAYMENT_METHODS } from "@hooks/useCheckout";
import { ORDER_FEES } from "@/constants";
import content from "@/content/checkout.json";

const { PLATFORM_FEE } = ORDER_FEES;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const {
    cartItems,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    paymentMethod,
    setPaymentMethod,
    paymentTiming,
    setPaymentTiming,
    loadingAddresses,
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponLoading,
    isLoading,
    subTotal,
    discountAmount,
    finalAmount,
    handleApplyCoupon,
    handleRemoveCoupon,
    handlePlaceOrder,
    goBack,
    addAddress,
  } = useCheckout();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0E9F6E", "#0891B2"]}
        style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.headerTitle}</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {cartItems[0]?.businessName ?? content.defaultOrderTitle}
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
                {content.currency} {item.price * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{content.sections.deliveryAddress}</Text>
            <TouchableOpacity onPress={addAddress}>
              <Text style={styles.addLink}>{content.sections.addNew}</Text>
            </TouchableOpacity>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator size="small" color="#D97706" style={{ marginTop: 12 }} />
          ) : addresses.length === 0 ? (
            <View style={styles.noAddressWrap}>
              <Text style={styles.noAddressText}>{content.noAddress.text}</Text>
              <TouchableOpacity style={styles.addAddressBtn} onPress={addAddress}>
                <Text style={styles.addAddressBtnText}>{content.noAddress.add}</Text>
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
                          <Text style={styles.defaultBadgeText}>{content.defaultBadge}</Text>
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
          <Text style={styles.sectionTitle}>{content.sections.paymentMethod}</Text>
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.key;
            return (
              <TouchableOpacity
                key={method.key}
                style={[styles.paymentCard, selected ? styles.paymentCardActive : null]}
                onPress={() => setPaymentMethod(method.key)}
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
                <Text style={styles.paymentLabel}>
                  {content.payment[method.key]}
                </Text>
              </TouchableOpacity>
            );
          })}

          {paymentMethod !== "cash" ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                {content.payment.timingTitle}
              </Text>
              {(
                [
                  ["atOrder", content.payment.atOrder],
                  ["atDelivery", content.payment.atDelivery],
                ] as const
              ).map(([key, label]) => {
                const selected = paymentTiming === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.paymentCard, selected ? styles.paymentCardActive : null]}
                    onPress={() => setPaymentTiming(key)}
                  >
                    <View style={styles.addressRadio}>
                      <View
                        style={[
                          styles.radioCircle,
                          selected ? styles.radioCircleActive : null,
                        ]}
                      />
                    </View>
                    <Text style={styles.paymentLabel}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null}
        </View>

        {/* Coupon / Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{content.sections.promoCode}</Text>
          {appliedCoupon ? (
            <View style={styles.couponApplied}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedCode}>{appliedCoupon.code}</Text>
                <Text style={styles.couponAppliedSavings}>
                  {content.coupon.savePrefix} {appliedCoupon.discountAmount}{content.coupon.saveSuffix}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} style={styles.couponRemoveBtn}>
                <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
                <Text style={styles.couponRemoveText}>{content.coupon.remove}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                placeholder={content.coupon.placeholder}
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
                  <Text style={styles.couponApplyBtnText}>{content.coupon.apply}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bill details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{content.sections.billDetails}</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{content.bill.subtotalPrefix}{cartItems.length}{content.bill.subtotalSuffix}</Text>
            <Text style={styles.billValue}>{content.currency} {subTotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{content.bill.platformFee}</Text>
            <Text style={styles.billValue}>{content.currency} {PLATFORM_FEE}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{content.bill.deliveryFee}</Text>
            <Text style={styles.billValueGreen}>{content.bill.free}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{content.bill.tax}</Text>
            <Text style={styles.billValueGreen}>{content.bill.none}</Text>
          </View>
          {discountAmount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{content.bill.promoPrefix}{appliedCoupon?.code}{content.bill.promoSuffix}</Text>
              <Text style={styles.billValueGreen}>- {content.currency} {discountAmount}</Text>
            </View>
          ) : null}
          <View style={styles.billDivider} />
          <View style={styles.billRow}>
            <Text style={styles.billLabelBold}>{content.bill.total}</Text>
            <Text style={styles.billValueBold}>{content.currency} {finalAmount}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order CTA */}
      <View style={styles.bottomCta}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.ctaTotalLabel}>{content.cta.total}{discountAmount > 0 ? `${content.cta.savedPrefix}${discountAmount}${content.cta.savedSuffix}` : ""}</Text>
            <Text style={styles.ctaTotalAmount}>{content.currency} {finalAmount}</Text>
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
              <Text style={styles.placeOrderText}>{content.cta.placeOrder}</Text>
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
  addLink: { fontSize: 13, fontWeight: "700", color: "#0E9F6E" },
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
    backgroundColor: "#0E9F6E",
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
  addressCardActive: { borderColor: "#0E9F6E", backgroundColor: "#ECFDF5" },
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
  radioCircleActive: { borderColor: "#0E9F6E", backgroundColor: "#0E9F6E" },
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
  paymentCardActive: { borderColor: "#0E9F6E", backgroundColor: "#ECFDF5" },
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
  billValueBold: { fontSize: 15, fontWeight: "800", color: "#0E9F6E" },
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
    backgroundColor: "#F59E0B",
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
    backgroundColor: "#0E9F6E",
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
