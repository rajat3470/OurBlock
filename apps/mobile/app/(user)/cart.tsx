import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { updateQuantity, removeItem, clearCart } from "../../src/store/slices/cartSlice";

const PLATFORM_FEE = 2;
const MINIMUM_ORDER = 50;

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const subTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const finalAmount = subTotal + PLATFORM_FEE;

  const canCheckout = cartItems.length > 0 && subTotal >= MINIMUM_ORDER;

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

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse products on the home screen and add items to your cart.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/(user)/home")}
          >
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({cartItems.length} items)</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Shop name */}
        <View style={styles.shopRow}>
          <Text style={styles.shopLabel}>🏪 {cartItems[0]?.businessName ?? "Shop"}</Text>
        </View>

        {/* Cart items */}
        {cartItems.map((item) => (
          <View key={item.productId} style={styles.itemCard}>
            <View style={styles.itemImageWrap}>
              {item.productImage ? (
                <Image
                  source={{ uri: item.productImage }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.itemImageFallback}>
                  <Text style={styles.itemImageEmoji}>🛍️</Text>
                </View>
              )}
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName}
              </Text>
              <Text style={styles.itemPrice}>Rs {item.price} × {item.quantity}</Text>
              <Text style={styles.itemLineTotal}>Rs {item.price * item.quantity}</Text>
            </View>
            <View style={styles.itemActions}>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleDecrease(item.productId, item.quantity)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyCount}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    handleIncrease(item.productId, item.quantity, item.maxQuantity)
                  }
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(item.productId)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Price summary */}
        <View style={styles.summaryWrap}>
          <Text style={styles.summaryTitle}>Bill Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs {subTotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Fee</Text>
            <Text style={styles.summaryValue}>Rs {PLATFORM_FEE}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValueGreen}>FREE</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST / Tax</Text>
            <Text style={styles.summaryValueGreen}>None</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total Amount</Text>
            <Text style={styles.summaryValueBold}>Rs {finalAmount}</Text>
          </View>
          {subTotal < MINIMUM_ORDER ? (
            <View style={styles.minOrderWarn}>
              <Text style={styles.minOrderWarnText}>
                ⚠ Minimum order is Rs {MINIMUM_ORDER}. Add Rs{" "}
                {MINIMUM_ORDER - subTotal} more to proceed.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout CTA */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 20, color: "#111827" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" },
  headerRight: { width: 40 },
  clearText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  browseBtn: {
    marginTop: 8,
    backgroundColor: "#D97706",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnText: { fontWeight: "800", color: "#FFFFFF", fontSize: 15 },
  scroll: { paddingBottom: 32 },
  shopRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFBF0",
    borderBottomWidth: 1,
    borderBottomColor: "#FEF3C7",
  },
  shopLabel: { fontSize: 14, fontWeight: "700", color: "#92400E" },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  itemImage: { width: 72, height: 72 },
  itemImageFallback: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImageEmoji: { fontSize: 30 },
  itemDetails: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemPrice: { fontSize: 12, color: "#6B7280" },
  itemLineTotal: { fontSize: 15, fontWeight: "800", color: "#D97706" },
  itemActions: { alignItems: "flex-end", gap: 8 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    overflow: "hidden",
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D97706",
  },
  qtyBtnText: { fontSize: 18, color: "#FFFFFF", fontWeight: "700" },
  qtyCount: {
    width: 32,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E",
  },
  removeBtn: { paddingHorizontal: 4 },
  removeText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  summaryWrap: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: "#111827", marginBottom: 4 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13, color: "#4B5563" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
  summaryValueGreen: { fontSize: 13, fontWeight: "700", color: "#059669" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 4 },
  summaryLabelBold: { fontSize: 15, fontWeight: "800", color: "#111827" },
  summaryValueBold: { fontSize: 15, fontWeight: "800", color: "#D97706" },
  minOrderWarn: {
    marginTop: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  minOrderWarnText: { fontSize: 12, fontWeight: "600", color: "#92400E" },
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
  totalLabel: { fontSize: 12, color: "#6B7280" },
  totalAmount: { fontSize: 18, fontWeight: "800", color: "#111827" },
  checkoutBtn: {
    backgroundColor: "#D97706",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  checkoutBtnDisabled: { backgroundColor: "#D1D5DB" },
  checkoutText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
