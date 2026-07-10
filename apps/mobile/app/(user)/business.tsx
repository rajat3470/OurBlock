import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeAdCard } from "@components/NativeAdCard";
import { MenuSkeleton } from "@components/Skeleton";
import { PressableScale } from "@components/PressableScale";
import { Product } from "@/types";
import { useBusinessDetail, DietFilter } from "@hooks/useBusinessDetail";
import content from "@/content/business.json";

export default function BusinessDetailScreen() {
  const insets = useSafeAreaInsets();
  const {
    listRef,
    cartItems,
    business,
    products,
    isLoading,
    error,
    dietFilter,
    setDietFilter,
    highlightId,
    customizeProduct,
    setCustomizeProduct,
    selectedOptions,
    setSelectedOptions,
    customizeQty,
    setCustomizeQty,
    bizOrderStatus,
    isOrderable,
    minOrder,
    bizCartCount,
    bizSubtotal,
    hasVeg,
    hasNonVeg,
    hasBestseller,
    sections,
    isNativeListingEnabled,
    openCustomize,
    commitCustomize,
    handleAddPress,
    decreaseQty,
    increaseQty,
    loadProducts,
    goBack,
    goToCart,
    goToProduct,
    displayQuantity,
    unitStepLabel,
    maxCartSteps,
    isBestsellerProduct,
    groupAttributes,
    getFirstImageUrl,
  } = useBusinessDetail();

  const renderMenuItem = ({ item: product }: { item: Product }) => {
    const imageUrl = getFirstImageUrl(product.imageUrls);
    const qty = cartItems.find((i) => i.productId === product.id)?.quantity ?? 0;
    const discount = Number(product.discount || 0);
    const uLabel = unitStepLabel(product.unit, product.unitStep);
    const maxSteps = maxCartSteps(product.stock, product.unit, product.unitStep);
    const bestseller = isBestsellerProduct(product);
    const highlighted = product.id === highlightId;

    return (
      <TouchableOpacity
        style={[styles.menuItem, highlighted ? styles.menuItemHighlighted : null]}
        activeOpacity={0.85}
        onPress={() => goToProduct(product)}
      >
        <View style={styles.menuItemLeft}>
          <View style={styles.menuItemTagRow}>
            {product.isVeg !== undefined ? (
              <View
                style={[
                  styles.dietMark,
                  { borderColor: product.isVeg ? "#16A34A" : "#DC2626" },
                ]}
              >
                <View
                  style={[
                    styles.dietDot,
                    { backgroundColor: product.isVeg ? "#16A34A" : "#DC2626" },
                  ]}
                />
              </View>
            ) : null}
            {bestseller ? (
              <View style={styles.bestsellerPill}>
                <Text style={styles.bestsellerText}>{content.bestseller}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.menuItemName} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.menuItemPriceRow}>
            <Text style={styles.menuItemPrice}>
              {content.currency} {product.price}{uLabel ? `/${uLabel}` : ""}
            </Text>
            {product.originalPrice && product.originalPrice > product.price ? (
              <Text style={styles.menuItemOriginalPrice}>{content.currency} {product.originalPrice}</Text>
            ) : null}
            {discount > 0 ? (
              <Text style={styles.menuItemDiscount}>{discount}{content.discountSuffix}</Text>
            ) : null}
          </View>

          {product.description ? (
            <Text style={styles.menuItemDesc} numberOfLines={2}>
              {product.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.menuItemRight}>
          <View style={styles.menuItemImageWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.menuItemImage} contentFit="cover" />
            ) : (
              <View style={styles.menuItemImageFallback}>
                <Text style={styles.menuItemFallbackEmoji}>{content.states.fallbackEmoji}</Text>
              </View>
            )}
            {product.stock <= 0 ? (
              <View style={styles.menuItemOosOverlay}>
                <Text style={styles.menuItemOosText}>{content.outOfStock}</Text>
              </View>
            ) : null}
          </View>

          {maxSteps > 0 && isOrderable ? (
            qty === 0 ? (
              <PressableScale
                style={styles.menuAddBtn}
                accessibilityRole="button"
                accessibilityLabel={`Add ${product.name} to cart`}
                onPress={(e) => {
                  e.stopPropagation();
                  if (product.attributes && product.attributes.length > 0) {
                    openCustomize(product);
                  } else {
                    handleAddPress(product);
                  }
                }}
              >
                <Text style={styles.menuAddBtnText}>{content.addBtn}</Text>
                <Text style={styles.menuAddPlus}>+</Text>
              </PressableScale>
            ) : (
              <View style={styles.menuQtyRow}>
                <TouchableOpacity
                  style={styles.menuQtyBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease quantity of ${product.name}`}
                  onPress={(e) => {
                    e.stopPropagation();
                    decreaseQty(product, qty);
                  }}
                >
                  <Text style={styles.menuQtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text
                  style={styles.menuQtyCount}
                  accessibilityLabel={`Quantity ${displayQuantity(qty, product.unit, product.unitStep)}`}
                >
                  {displayQuantity(qty, product.unit, product.unitStep)}
                </Text>
                <TouchableOpacity
                  style={styles.menuQtyBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity of ${product.name}`}
                  onPress={(e) => {
                    e.stopPropagation();
                    increaseQty(product, qty, maxSteps);
                  }}
                >
                  <Text style={styles.menuQtyBtnText}>+</Text>
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
        colors={["#0E9F6E", "#0891B2"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {business?.name ?? content.defaultBusinessName}
          </Text>
          {bizCartCount > 0 ? (
            <TouchableOpacity style={styles.cartBadgeBtn} onPress={goToCart}>
              <Text style={styles.cartBadgeText}>{bizCartCount}</Text>
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

      {/* Paused / closed notice banner */}
      {bizOrderStatus === "paused" ? (
        <View style={styles.orderNoticeBanner}>
          <Text style={styles.orderNoticeText}>{content.notices.paused}</Text>
        </View>
      ) : bizOrderStatus === "closed" ? (
        <View style={[styles.orderNoticeBanner, styles.orderNoticeClosedBanner]}>
          <Text style={styles.orderNoticeText}>{content.notices.closed}</Text>
        </View>
      ) : null}

      {/* Diet / bestseller filter bar */}
      {!isLoading && !error && products.length > 0 ? (
        <View style={styles.filterBarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
          >
            {(
              [
                { key: "all", label: "All" },
                ...(hasVeg ? [{ key: "veg", label: "\ud83d\udfe2 Veg" }] : []),
                ...(hasNonVeg ? [{ key: "nonveg", label: "\ud83d\udd34 Non-veg" }] : []),
                ...(hasBestseller ? [{ key: "bestseller", label: "\u2605 Bestseller" }] : []),
              ] as { key: DietFilter; label: string }[]
            ).map((chip) => {
              const active = dietFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Filter: ${chip.label}`}
                  onPress={() => setDietFilter(chip.key)}
                >
                  <Text
                    style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Products */}
      {isLoading ? (
        <MenuSkeleton rows={6} />
      ) : error ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProducts}>
            <Text style={styles.retryBtnText}>{content.states.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centeredState}>
          <Text style={styles.emptyEmoji}>{content.states.noProductsEmoji}</Text>
          <Text style={styles.emptyTitle}>{content.states.noProductsTitle}</Text>
          <Text style={styles.emptySubtitle}>{content.states.noProductsSubtitle}</Text>
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderMenuItem}
          onScrollToIndexFailed={() => {}}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
              <Text style={styles.sectionHeaderCount}>{section.data.length}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + (bizCartCount > 0 ? 110 : 24),
          }}
          ListEmptyComponent={
            <View style={styles.centeredState}>
              <Text style={styles.emptyEmoji}>{content.states.noMatchEmoji}</Text>
              <Text style={styles.emptyTitle}>{content.states.noMatchTitle}</Text>
              <Text style={styles.emptySubtitle}>{content.states.noMatchSubtitle}</Text>
            </View>
          }
          ListFooterComponent={
            isNativeListingEnabled ? (
              <NativeAdCard style={{ marginHorizontal: 16, marginTop: 12 }} />
            ) : null
          }
        />
      )}

      {/* Sticky View Cart bar */}
      {bizCartCount > 0 ? (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 10 }]}>
          {bizSubtotal < minOrder ? (
            <View style={styles.cartBarNotice}>
              <Text style={styles.cartBarNoticeText}>
                {content.cartBar.addMorePrefix}{minOrder - bizSubtotal}{content.cartBar.addMoreMiddle}{minOrder}{content.cartBar.addMoreSuffix}
              </Text>
            </View>
          ) : null}
          <View style={styles.cartBarRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartBarCount}>
                {bizCartCount} {bizCartCount !== 1 ? content.cartBar.itemPlural : content.cartBar.itemSingular} · {content.currency} {bizSubtotal}
              </Text>
              <Text style={styles.cartBarSub} numberOfLines={1}>
                {business?.name ?? content.defaultStoreName}
              </Text>
            </View>
            <PressableScale
              style={styles.cartBarBtn}
              accessibilityRole="button"
              accessibilityLabel={`View cart, ${bizCartCount} item${bizCartCount !== 1 ? "s" : ""}, total Rs ${bizSubtotal}`}
              onPress={goToCart}
            >
              <Text style={styles.cartBarBtnText}>{content.cartBar.viewCart}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </PressableScale>
          </View>
        </View>
      ) : null}

      <Modal
        visible={customizeProduct !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomizeProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCustomizeProduct(null)}
          />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {customizeProduct ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {customizeProduct.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCustomizeProduct(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Close customization"
                  >
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                {customizeProduct.description ? (
                  <Text style={styles.modalDesc} numberOfLines={2}>
                    {customizeProduct.description}
                  </Text>
                ) : null}
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {groupAttributes(customizeProduct.attributes).map((group) => (
                    <View key={group.name} style={styles.optionGroup}>
                      <Text style={styles.optionGroupTitle}>{group.name}</Text>
                      <View style={styles.optionChipsRow}>
                        {group.values.map((value) => {
                          const active = selectedOptions[group.name] === value;
                          return (
                            <TouchableOpacity
                              key={value}
                              style={[styles.optionChip, active ? styles.optionChipActive : null]}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: active }}
                              accessibilityLabel={`${group.name}: ${value}`}
                              onPress={() =>
                                setSelectedOptions((prev) => ({ ...prev, [group.name]: value }))
                              }
                            >
                              <Text
                                style={[
                                  styles.optionChipText,
                                  active ? styles.optionChipTextActive : null,
                                ]}
                              >
                                {value}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <View style={styles.modalQtyRow}>
                    <TouchableOpacity
                      style={styles.modalQtyBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                      onPress={() => setCustomizeQty((q) => Math.max(1, q - 1))}
                    >
                      <Text style={styles.modalQtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalQtyCount} accessibilityLabel={`Quantity ${customizeQty}`}>
                      {customizeQty}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalQtyBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                      onPress={() => setCustomizeQty((q) => q + 1)}
                    >
                      <Text style={styles.modalQtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <PressableScale
                    style={styles.modalAddBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${customizeProduct.name} to cart, Rs ${customizeProduct.price * customizeQty}`}
                    onPress={commitCustomize}
                  >
                    <Text style={styles.modalAddBtnText}>
                      {content.customize.addItemPrefix}{customizeProduct.price * customizeQty}
                    </Text>
                  </PressableScale>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 2,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
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
  bannerImage: { width: "100%", height: 150 },
  orderNoticeBanner: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  orderNoticeClosedBanner: { backgroundColor: "#FEE2E2", borderLeftColor: "#DC2626" },
  orderNoticeText: { fontSize: 13, fontWeight: "600", color: "#92400E" },
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
    backgroundColor: "#0E9F6E",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center" },

  filterBarWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: { backgroundColor: "#ECFDF5", borderColor: "#0E9F6E" },
  filterChipText: { fontSize: 12.5, fontWeight: "700", color: "#374151" },
  filterChipTextActive: { color: "#0E9F6E" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    backgroundColor: "#EEF0F3",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  itemSeparator: { height: 1, backgroundColor: "#F0F1F3", marginHorizontal: 16 },

  menuItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemHighlighted: {
    backgroundColor: "#ECFDF5",
    borderLeftWidth: 3,
    borderLeftColor: "#0E9F6E",
  },
  menuItemLeft: { flex: 1, paddingRight: 4 },
  menuItemTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    minHeight: 18,
  },
  dietMark: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dietDot: { width: 7, height: 7, borderRadius: 3.5 },
  bestsellerPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bestsellerText: { fontSize: 10.5, fontWeight: "800", color: "#B45309" },
  menuItemName: { fontSize: 15.5, fontWeight: "700", color: "#111827", lineHeight: 21 },
  menuItemPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  menuItemPrice: { fontSize: 14, fontWeight: "800", color: "#111827" },
  menuItemOriginalPrice: {
    fontSize: 12.5,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  menuItemDiscount: { fontSize: 11.5, fontWeight: "800", color: "#16A34A" },
  menuItemDesc: { marginTop: 6, fontSize: 12.5, color: "#6B7280", lineHeight: 18 },

  menuItemRight: { width: 116, alignItems: "center" },
  menuItemImageWrap: {
    width: 116,
    height: 116,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  menuItemImage: { width: "100%", height: "100%" },
  menuItemImageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  menuItemFallbackEmoji: { fontSize: 40 },
  menuItemOosOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemOosText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  menuAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: -18,
    minWidth: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0E9F6E",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  menuAddBtnText: { fontSize: 14, fontWeight: "800", color: "#0E9F6E", letterSpacing: 0.5 },
  menuAddPlus: { fontSize: 14, fontWeight: "800", color: "#0E9F6E" },
  menuQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -18,
    minWidth: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0E9F6E",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  menuQtyBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#ECFDF5" },
  menuQtyBtnText: { fontSize: 16, fontWeight: "800", color: "#0E9F6E" },
  menuQtyCount: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  cartBarNotice: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  cartBarNoticeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#B45309",
    textAlign: "center",
  },
  cartBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cartBarCount: { fontSize: 15, fontWeight: "800", color: "#111827" },
  cartBarSub: { fontSize: 11.5, color: "#6B7280", marginTop: 1 },
  cartBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  cartBarBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#111827" },
  modalDesc: { marginTop: 6, fontSize: 13, color: "#6B7280", lineHeight: 19 },
  optionGroup: { marginTop: 16 },
  optionGroupTitle: { fontSize: 13.5, fontWeight: "800", color: "#111827", marginBottom: 8 },
  optionChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionChipActive: { backgroundColor: "#ECFDF5", borderColor: "#0E9F6E" },
  optionChipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  optionChipTextActive: { color: "#0E9F6E" },
  modalFooter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  modalQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0E9F6E",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalQtyBtn: { paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "#ECFDF5" },
  modalQtyBtnText: { fontSize: 17, fontWeight: "800", color: "#0E9F6E" },
  modalQtyCount: {
    minWidth: 36,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  modalAddBtn: {
    flex: 1,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalAddBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
