import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { displayQuantity } from "@utils/helpers";
import { useCart } from "@hooks/useCart";
import { BannerAdStrip } from "@components/BannerAdStrip";
import content from "@/content/cart.json";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const {
    cartItems,
    subTotal,
    finalAmount,
    canCheckout,
    minOrder,
    businessStatus,
    isStoreOpen,
    adsEnabled,
    handleIncrease,
    handleDecrease,
    handleRemove,
    handleClearCart,
    goBack,
    goToHome,
    goToShop,
    goToCheckout,
  } = useCart();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#084C3D", "#084C3D"]}
        style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.headerTitle}</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>{content.clear}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {cartItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.emptyTitle}>{content.empty.title}</Text>
          <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={goToHome}>
            <Text style={styles.browseBtnText}>{content.empty.browse}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.shopRow}>
              <View style={styles.shopLabelWrap}>
                <Ionicons name="storefront-outline" size={18} color="#084C3D" />
                <Text style={styles.shopLabel}>{cartItems[0]?.businessName ?? content.defaultShop}</Text>
              </View>
              {!isStoreOpen ? (
                <View style={styles.shopStatusBadge}>
                  <Text style={styles.shopStatusText}>
                    {businessStatus === "closed" ? "Closed" : "Paused"}
                  </Text>
                </View>
              ) : null}
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
                  {item.selectedAttributes && item.selectedAttributes.length > 0 ? (
                    <Text style={styles.itemOptions} numberOfLines={1}>
                      {item.selectedAttributes.map((a) => a.value).join(", ")}
                    </Text>
                  ) : null}
                  <Text style={styles.itemPrice}>{content.currency} {item.price} × {displayQuantity(item.quantity, item.unit, item.unitStep)}</Text>
                  <Text style={styles.itemLineTotal}>{content.currency} {item.price * item.quantity}</Text>
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
                    <Text style={styles.removeText}>{content.remove}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {subTotal < minOrder ? (
              <View style={styles.minOrderWarn}>
                <Ionicons name="information-circle-outline" size={14} color="#B45309" />
                <Text style={styles.minOrderWarnText}>{content.minOrder.prefix} {minOrder - subTotal} {content.minOrder.middle} {minOrder} {content.minOrder.suffix}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.addMoreBtn} onPress={goToShop} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={18} color="#084C3D" />
              <Text style={styles.addMoreText}>Add more items</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {adsEnabled && (
              <View style={styles.adBannerWrap}>
                <BannerAdStrip size="MEDIUM_RECTANGLE" />
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.bottomCta}>
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.totalLabel}>{content.total}</Text>
                <Text style={styles.totalAmount}>{content.currency} {finalAmount}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, !canCheckout ? styles.checkoutBtnDisabled : null]}
                disabled={!canCheckout}
                onPress={goToCheckout}
              >
                <Text style={styles.checkoutText}>{content.checkout}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF6EC" },
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
  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", backgroundColor: "#084C3D" },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  browseBtn: { marginTop: 8, backgroundColor: "#F6B853", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { fontWeight: "800", color: "#FFFFFF", fontSize: 15 },
  scroll: { paddingBottom: 200 },
  shopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0", marginBottom: 4 },
  shopLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  shopLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  shopStatusBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#FDE68A" },
  shopStatusText: { fontSize: 11, fontWeight: "700", color: "#B45309" },
  itemCard: { flexDirection: "row", backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 12, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  itemImageWrap: { width: 72, height: 72, borderRadius: 10, overflow: "hidden", backgroundColor: "#F3F4F6" },
  itemImage: { width: 72, height: 72 },
  itemImageFallback: { width: 72, height: 72, alignItems: "center", justifyContent: "center", backgroundColor: "#084C3D", borderRadius: 10 },
  itemDetails: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemOptions: { fontSize: 11.5, color: "#9CA3AF", marginTop: 1 },
  itemPrice: { fontSize: 12, color: "#6B7280" },
  itemLineTotal: { fontSize: 15, fontWeight: "800", color: "#084C3D" },
  itemActions: { alignItems: "flex-end", gap: 8 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(14,159,110,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(14,159,110,0.18)", overflow: "hidden" },
  qtyBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#084C3D" },
  qtyBtnText: { fontSize: 18, color: "#FFFFFF", fontWeight: "700" },
  qtyCount: { width: 32, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#0B2E22" },
  removeBtn: { paddingHorizontal: 4 },
  removeText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  minOrderWarn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 0, backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FDE68A" },
  minOrderWarnText: { fontSize: 12, fontWeight: "600", color: "#B45309", flex: 1 },
  bottomCta: { position: "absolute", bottom: 104, left: 16, right: 16, backgroundColor: "#FFFFFF", padding: 16, borderRadius: 20, shadowColor: "#084C3D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 12, color: "#6B7280" },
  totalAmount: { fontSize: 18, fontWeight: "800", color: "#111827" },
  checkoutBtn: { backgroundColor: "#F6B853", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  checkoutBtnDisabled: { backgroundColor: "#D1D5DB" },
  checkoutText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  addMoreBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  addMoreText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#084C3D" },
  adBannerWrap: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, overflow: "hidden" },
});
