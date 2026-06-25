import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useToast } from "react-native-toast-notifications";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { addItem, clearCart, updateQuantity } from "../../src/store/slices/cartSlice";
import { userAppService } from "../../src/services/userAppService";
import { Product, Business } from "../../src/types";
import { unitStepLabel, displayQuantity, maxCartSteps, stockBadgeInfo } from "../../src/utils/helpers";

function getFirstImageUrl(images?: string[]) {
  return images?.find((url) => typeof url === "string" && url.trim().length > 0) ?? null;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function getBusinessOrderStatus(business: Business): "open" | "paused" | "closed" {
  if (business.status !== "active") return "closed";
  let withinHours = true;
  if (business.operatingHours) {
    const now = new Date();
    const dayKey = DAYS[now.getDay()];
    const hours = business.operatingHours[dayKey];
    if (!hours || hours.isClosed) {
      withinHours = false;
    } else {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      withinHours = current >= hours.open && current < hours.close;
    }
  }
  if (!withinHours) return "closed";
  if (business.isTakingOrders === false) return "paused";
  return "open";
}

export default function ProductDetailScreen() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { id: productId, businessId: paramBizId } = useLocalSearchParams<{
    id: string;
    businessId?: string;
  }>();

  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);

  const [product, setProduct] = useState<Product | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const insets = useSafeAreaInsets();

  // Load product from the home feed (from redux) or fetch individually
  const featuredProducts = useAppSelector((state) => state.userApp.featuredProducts);
  const businesses = useAppSelector((state) => state.userApp.businesses);

  useEffect(() => {
    if (!productId) return;

    // Try to find from existing state first (instant load)
    const localProduct = featuredProducts.find((p) => p.id === productId);
    const localBiz = businesses.find((b) => b.id === (localProduct?.businessId ?? paramBizId));

    if (localProduct) {
      setProduct(localProduct);
      if (localBiz) setBusiness(localBiz);
      setIsLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          userAppService.getFeaturedProducts(""), // fallback: just show what we have
        ]);
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, featuredProducts, businesses, paramBizId]);

  const cartItem = cartItems.find((i) => i.productId === productId);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const qty = cartItem?.quantity ?? 0;
  const bizOrderStatus = business ? getBusinessOrderStatus(business) : "open";
  const isOrderable = bizOrderStatus === "open";

  // Weight-aware derived values
  const maxSteps = product ? maxCartSteps(product.stock, product.unit, product.unitStep) : 0;
  const uLabel = product ? unitStepLabel(product.unit, product.unitStep) : "";

  function addCurrentProductToCart(targetProduct: Product) {
    dispatch(
      addItem({
        productId: targetProduct.id,
        productName: targetProduct.name,
        productImage: getFirstImageUrl(targetProduct.imageUrls),
        businessId: targetProduct.businessId,
        businessName: business?.name ?? "Local Store",
        price: targetProduct.price,
        quantity: 1,
        maxQuantity: maxCartSteps(targetProduct.stock, targetProduct.unit, targetProduct.unitStep),
        unit: targetProduct.unit,
        unitStep: targetProduct.unitStep,
      })
    );
    toast.show(`${targetProduct.name} added to cart`, { type: "success" });
  }

  function handleAddToCart() {
    if (!product) return;

    if (cartBusinessId && cartBusinessId !== product.businessId) {
      Alert.alert(
        "Replace cart items?",
        "Your cart has items from another shop. Continue to clear cart and add this item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, replace",
            style: "destructive",
            onPress: () => {
              dispatch(clearCart());
              addCurrentProductToCart(product);
            },
          },
        ]
      );
      return;
    }

    addCurrentProductToCart(product);
  }

  function handleIncrease() {
    if (!product || !cartItem) return;
    if (cartItem.quantity >= maxSteps) {
      const stockLabel = uLabel ? `${product.stock}${product.unit}` : `${product.stock}`;
      toast.show(`Only ${stockLabel} in stock`, { type: "warning" });
      return;
    }
    dispatch(updateQuantity({ productId: product.id, quantity: cartItem.quantity + 1 }));
  }

  function handleDecrease() {
    if (!product) return;
    dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#DC2626", "#991B1B"]}
          style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#DC2626", "#991B1B"]}
          style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.loadingWrap}>
          <Text style={styles.notFoundText}>Product not found</Text>
        </View>
      </View>
    );
  }

  const discount = Number(product.discount || 0);
  const originalPrice = product.originalPrice ?? Math.round(product.price / (1 - discount / 100));
  const images = product.imageUrls.filter((url) => url?.trim());

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#DC2626", "#991B1B"]}
        style={[styles.headerRow, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        {cartCount > 0 ? (
          <TouchableOpacity
            style={styles.cartBadgeBtn}
            onPress={() => router.push("/(user)/cart")}
          >
            <Ionicons name="cart" size={16} color="#FFFFFF" />
            <Text style={styles.cartBadgeText}>{cartCount}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} style={styles.scrollView}>
        {/* Image */}
        <View style={styles.imageWrap}>
          {images.length > 0 ? (
            <Image
              source={{ uri: images[selectedImageIndex] }}
              style={styles.mainImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>mohallaMitr</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Thumbnail row */}
        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
          >
            {images.map((url, index) => (
              <TouchableOpacity key={index} onPress={() => setSelectedImageIndex(index)}>
                <Image
                  source={{ uri: url }}
                  style={[
                    styles.thumb,
                    selectedImageIndex === index ? styles.thumbActive : null,
                  ]}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* Product info */}
        <View style={styles.infoWrap}>
          <Text style={styles.productName}>{product.name}</Text>

          {business ? (
            <Text style={styles.businessName}>{business.name}</Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              Rs {product.price}{uLabel ? `/${uLabel}` : ""}
            </Text>
            {discount > 0 ? (
              <Text style={styles.originalPrice}>Rs {originalPrice}</Text>
            ) : null}
            {product.rating ? (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {product.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {(() => {
            const badge = stockBadgeInfo(product.stock, product.unit, product.unitStep);
            return (
              <View style={styles.stockRow}>
                <View
                  style={[
                    styles.stockBadge,
                    badge.isOut ? styles.stockLow : badge.isLow ? styles.stockLow : styles.stockOk,
                  ]}
                >
                  <Text style={styles.stockText}>{badge.label}</Text>
                </View>
                <Text style={styles.categoryTag}>{product.category}</Text>
              </View>
            );
          })()}

          {product.description ? (
            <View style={styles.descWrap}>
              <Text style={styles.descTitle}>Description</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          ) : null}

          {product.attributes && product.attributes.length > 0 ? (
            <View style={styles.attrsWrap}>
              <Text style={styles.attrsTitle}>Details</Text>
              {product.attributes.map((attr, idx) => (
                <View key={idx} style={styles.attrRow}>
                  <Text style={styles.attrName}>{attr.name}</Text>
                  <Text style={styles.attrValue}>{attr.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Pricing summary */}
          <View style={styles.priceSummaryWrap}>
            <Text style={styles.priceSummaryTitle}>Price Details</Text>
            <View style={styles.priceSummaryRow}>
              <Text style={styles.priceSummaryLabel}>
                {uLabel ? `Price per ${uLabel}` : "Product Price"}
              </Text>
              <Text style={styles.priceSummaryValue}>Rs {product.price}</Text>
            </View>
            <View style={styles.priceSummaryRow}>
              <Text style={styles.priceSummaryLabel}>Platform Fee</Text>
              <Text style={styles.priceSummaryValue}>Rs 2</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceSummaryRow}>
              <Text style={styles.priceSummaryLabelBold}>
                {uLabel ? `Total (1 × ${uLabel})` : "Total (1 item)"}
              </Text>
              <Text style={styles.priceSummaryValueBold}>Rs {product.price + 2}</Text>
            </View>
            <Text style={styles.priceNote}>Platform fee of Rs 2 is charged per order. No delivery or GST charges.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Add to Cart Button above tab bar */}
      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom }]}>
        {maxSteps <= 0 ? (
          <View style={styles.outOfStockBtn}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        ) : !isOrderable ? (
          <View style={[styles.outOfStockBtn, styles.shopNotOrderableBtn]}>
            <Text style={styles.outOfStockText}>
              {bizOrderStatus === "paused" ? "⏸ Shop Paused" : "🕐 Shop Closed"}
            </Text>
          </View>
        ) : qty === 0 ? (
          <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.qtyRow}>
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrease}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyCount}>{displayQuantity(qty, product.unit, product.unitStep)}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleIncrease}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.goToCartBtn}
              onPress={() => router.push("/(user)/cart")}
            >
              <Text style={styles.goToCartText}>Go to Cart · Rs {cartTotal + 2}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA", flexDirection: "column" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, color: "#6B7280" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  headerTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  headerRight: { width: 64 },
  cartBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  cartBadgeText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  scroll: { paddingBottom: 16 },
  scrollView: { flex: 1 },
  imageWrap: {
    width: "100%",
    height: 280,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  mainImage: { width: "100%", height: 280 },
  imagePlaceholder: {
    width: "100%",
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderEmoji: { fontSize: 72 },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountBadgeText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  thumbRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  thumbActive: { borderColor: "#DC2626" },
  infoWrap: { padding: 16 },
  productName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  price: { fontSize: 24, fontWeight: "800", color: "#DC2626" },
  originalPrice: {
    fontSize: 16,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  ratingBadge: {
    marginLeft: "auto",
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#065F46" },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stockBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockOk: { backgroundColor: "#ECFDF5" },
  stockLow: { backgroundColor: "#FEF3C7" },
  stockText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  categoryTag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    textTransform: "capitalize",
  },
  descWrap: { marginBottom: 16 },
  descTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  descText: { fontSize: 14, color: "#4B5563", lineHeight: 22 },
  attrsWrap: { marginBottom: 16 },
  attrsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  attrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  attrName: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  attrValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
  priceSummaryWrap: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 8,
  },
  priceSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 10,
  },
  priceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  priceSummaryLabel: { fontSize: 13, color: "#4B5563" },
  priceSummaryValue: { fontSize: 13, color: "#374151", fontWeight: "600" },
  priceDivider: {
    height: 1,
    backgroundColor: "#FECACA",
    marginVertical: 8,
  },
  priceSummaryLabelBold: { fontSize: 14, fontWeight: "800", color: "#111827" },
  priceSummaryValueBold: { fontSize: 14, fontWeight: "800", color: "#DC2626" },
  priceNote: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    lineHeight: 16,
  },
  bottomCta: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  fixedButtonContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  outOfStockBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  shopNotOrderableBtn: {
    backgroundColor: "#FEF3C7",
  },
  outOfStockText: { fontSize: 16, fontWeight: "700", color: "#9CA3AF" },
  addToCartBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  addToCartText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
    overflow: "hidden",
  },
  qtyBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
  },
  qtyBtnText: { fontSize: 22, color: "#FFFFFF", fontWeight: "700" },
  qtyCount: {
    width: 40,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#991B1B",
  },
  goToCartBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  goToCartText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
