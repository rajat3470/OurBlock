import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "react-native-toast-notifications";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { addItem, updateQuantity } from "../../src/store/slices/cartSlice";
import { userAppService } from "../../src/services/userAppService";
import { Business, Product } from "../../src/types";
import { useUserApp } from "../../src/hooks/useUserApp";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function getFirstImageUrl(images?: string[]) {
  return images?.find((url) => typeof url === "string" && url.trim().length > 0) ?? null;
}

export default function BusinessDetailScreen() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { id: businessId } = useLocalSearchParams<{ id: string }>();

  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const cartCount = useAppSelector((state) => state.cart.items.reduce((acc, i) => acc + i.quantity, 0));

  const { businesses } = useUserApp();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;

    // Try to find business from existing state first
    const localBiz = businesses.find((b) => b.id === businessId);
    if (localBiz) setBusiness(localBiz);

    // Fetch products for this business
    setIsLoading(true);
    setError(null);
    userAppService
      .getProductsByBusiness(businessId)
      .then((data) => {
        setProducts(data);
      })
      .catch(() => {
        setError("Could not load products. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [businessId]);

  const renderProduct = ({ item: product }: { item: Product }) => {
    const imageUrl = getFirstImageUrl(product.imageUrls);
    const qty = cartItems.find((i) => i.productId === product.id)?.quantity ?? 0;
    const discount = Number(product.discount || 0);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() =>
          router.push({
            pathname: "/(user)/product",
            params: { id: product.id, businessId: product.businessId },
          })
        }
        activeOpacity={0.85}
      >
        <View style={styles.productThumb}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productThumbImage} contentFit="cover" />
          ) : (
            <View style={styles.productThumbFallback}>
              <Text style={styles.fallbackEmoji}>🛍️</Text>
            </View>
          )}
          {discount > 0 ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{discount}% OFF</Text>
            </View>
          ) : null}
          {product.stock <= 0 ? (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockOverlayText}>Out of Stock</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.productPriceRow}>
            <Text style={styles.productPrice}>Rs {product.price}</Text>
            {product.originalPrice && product.originalPrice > product.price ? (
              <Text style={styles.productOriginalPrice}>Rs {product.originalPrice}</Text>
            ) : null}
          </View>

          {product.stock > 0 ? (
            qty === 0 ? (
              <TouchableOpacity
                style={styles.addCartBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  if (cartBusinessId && cartBusinessId !== product.businessId) {
                    toast.show("Adding this will clear your existing cart", { type: "warning" });
                  }
                  dispatch(
                    addItem({
                      productId: product.id,
                      productName: product.name,
                      productImage: imageUrl,
                      businessId: product.businessId,
                      businessName: business?.name ?? "Local Store",
                      price: product.price,
                      quantity: 1,
                      maxQuantity: product.stock,
                    })
                  );
                  toast.show(`${product.name} added`, { type: "success" });
                }}
              >
                <Text style={styles.addCartBtnText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.miniQtyRow}>
                <TouchableOpacity
                  style={styles.miniQtyBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    dispatch(updateQuantity({ productId: product.id, quantity: qty - 1 }));
                  }}
                >
                  <Text style={styles.miniQtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.miniQtyCount}>{qty}</Text>
                <TouchableOpacity
                  style={styles.miniQtyBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (qty >= product.stock) {
                      toast.show(`Only ${product.stock} available`, { type: "warning" });
                      return;
                    }
                    dispatch(updateQuantity({ productId: product.id, quantity: qty + 1 }));
                  }}
                >
                  <Text style={styles.miniQtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#DC2626", "#991B1B"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {business?.name ?? "Shop"}
          </Text>
          {cartCount > 0 ? (
            <TouchableOpacity
              style={styles.cartBadgeBtn}
              onPress={() => router.push("/(user)/cart")}
            >
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        {/* Business info strip */}
        {business ? (
          <View style={styles.bizInfoRow}>
            <View style={styles.bizInfoItem}>
              <Ionicons name="star" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.bizInfoText}>
                {Number(business.rating || 0).toFixed(1)}
              </Text>
            </View>
            <View style={styles.bizInfoDot} />
            <Text style={styles.bizInfoText} numberOfLines={1}>
              {business.category}
            </Text>
            {business.address ? (
              <>
                <View style={styles.bizInfoDot} />
                <Text style={styles.bizInfoText} numberOfLines={1}>
                  {business.address}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>

      {/* Banner image if available */}
      {business?.bannerUrl || business?.imageUrl ? (
        <Image
          source={{ uri: business.bannerUrl ?? business.imageUrl }}
          style={styles.bannerImage}
          contentFit="cover"
        />
      ) : null}

      {/* Products */}
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.stateText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              if (!businessId) return;
              setIsLoading(true);
              setError(null);
              userAppService
                .getProductsByBusiness(businessId)
                .then(setProducts)
                .catch(() => setError("Could not load products. Please try again."))
                .finally(() => setIsLoading(false));
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centeredState}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySubtitle}>
            This shop hasn't added products yet. Check back soon!
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.productsHeader}>
              {products.length} item{products.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cartBadgeBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  cartBadgeText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  bizInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
    flexWrap: "wrap",
  },
  bizInfoItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  bizInfoDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  bizInfoText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    flexShrink: 1,
  },
  bannerImage: {
    width: "100%",
    height: 160,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  stateText: { fontSize: 14, color: "#6B7280", marginTop: 8 },
  errorText: { fontSize: 15, color: "#DC2626", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  productsHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  columnWrapper: { gap: 12, marginBottom: 12 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  productThumb: {
    width: "100%",
    height: 140,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  productThumbImage: { width: "100%", height: "100%" },
  productThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackEmoji: { fontSize: 44 },
  discountPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountPillText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
  outOfStockOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockOverlayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: "600", color: "#111827", marginBottom: 4, lineHeight: 18 },
  productPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  productPrice: { fontSize: 14, fontWeight: "800", color: "#DC2626" },
  productOriginalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  addCartBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  addCartBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  miniQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DC2626",
    borderRadius: 8,
    overflow: "hidden",
  },
  miniQtyBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    backgroundColor: "#FEF2F2",
  },
  miniQtyBtnText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
  miniQtyCount: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});
