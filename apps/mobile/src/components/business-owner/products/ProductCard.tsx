import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Product } from "@/types";
import content from "@/content/boProducts.json";

interface ApprovalMeta {
  bg: string;
  color: string;
  icon: string;
  label: string;
}

interface ProductCardProps {
  product: Product;
  getApprovalMeta: (status: string) => ApprovalMeta;
  onToggleAvailableToday: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onDelete: (id: string | undefined, name: string) => void;
}

export function ProductCard({
  product,
  getApprovalMeta,
  onToggleAvailableToday,
  onToggleStatus,
  onDelete,
}: ProductCardProps) {
  const approval = product.approvalStatus ?? "pending";
  const isApproved = approval === "approved";
  const approvalMeta = getApprovalMeta(approval);

  const firstImage = product.imageUrls?.[0];
  const price = product.price ?? 0;
  const originalPrice = product.originalPrice;
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.thumbWrap}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={styles.thumbPlaceholderText}>{content.empty.emoji}</Text>
            </View>
          )}
          {discount !== null && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {discount}
                {content.card.discountSuffix}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <Text style={styles.productName} numberOfLines={2}>
              {product.name ?? content.card.noName}
            </Text>
            {product.isVeg !== undefined && (
              <View style={product.isVeg ? styles.vegDot : styles.nonVegDot} />
            )}
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>
                {product.category ?? content.card.fallbackCategory}
              </Text>
            </View>
            {product.menuSection ? (
              <View style={[styles.categoryChip, { backgroundColor: "#EFF6FF" }]}>
                <Text style={[styles.categoryChipText, { color: "#1D4ED8" }]}>
                  {product.menuSection}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {content.currency}
              {price}
            </Text>
            {originalPrice && originalPrice > price ? (
              <Text style={styles.originalPrice}>
                {content.currency}
                {originalPrice}
              </Text>
            ) : null}
          </View>
          <Text style={styles.stockText}>
            {content.card.stockPrefix}
            <Text style={(product.stock ?? 0) > 0 ? styles.stockGood : styles.stockOut}>
              {product.stock ?? 0}
            </Text>
          </Text>
        </View>
      </View>

      <View style={[styles.approvalBanner, { backgroundColor: approvalMeta.bg }]}>
        <Text style={[styles.approvalIcon, { color: approvalMeta.color }]}>
          {approvalMeta.icon}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.approvalLabel, { color: approvalMeta.color }]}>
            {approvalMeta.label}
          </Text>
          {approval === "rejected" && product.approvalNote ? (
            <Text style={styles.approvalNote}>
              {content.card.approvalNotes.reasonPrefix}
              {product.approvalNote}
            </Text>
          ) : null}
          {approval === "pending" ? (
            <Text style={styles.approvalNote}>{content.card.approvalNotes.pending}</Text>
          ) : null}
        </View>
      </View>

      {isApproved ? (
        <TouchableOpacity
          style={[
            styles.availBanner,
            product.availableToday ? styles.availOn : styles.availOff,
          ]}
          onPress={() => onToggleAvailableToday(product)}
          activeOpacity={0.8}
        >
          <Text style={styles.availIcon}>{product.availableToday ? "✅" : "⏸️"}</Text>
          <View style={styles.availInfo}>
            <Text
              style={[
                styles.availLabel,
                { color: product.availableToday ? "#16A34A" : "#64748B" },
              ]}
            >
              {product.availableToday
                ? content.card.availableToday
                : content.card.unavailableToday}
            </Text>
            <Text style={styles.availHint}>{content.card.toggleHint}</Text>
          </View>
          <View
            style={[
              styles.availPill,
              { backgroundColor: product.availableToday ? "#22C55E" : "#CBD5E1" },
            ]}
          >
            <Text style={styles.availPillText}>
              {product.availableToday ? content.card.on : content.card.off}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.actionsRow}>
        {isApproved ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.statusBtn]}
            onPress={() => onToggleStatus(product)}
          >
            <Text style={styles.statusBtnText}>
              {product.status === "active"
                ? content.card.setInactive
                : content.card.setActive}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => onDelete(product.id, product.name)}
        >
          <Text style={styles.deleteBtnText}>{content.card.delete}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  thumbPlaceholderText: {
    fontSize: 28,
  },
  discountBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#EF4444",
    paddingVertical: 2,
    alignItems: "center",
  },
  discountBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  categoryChipText: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#16A34A",
  },
  originalPrice: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  stockText: {
    fontSize: 12,
    color: "#6B7280",
  },
  stockGood: {
    color: "#16A34A",
    fontWeight: "700",
  },
  stockOut: {
    color: "#EF4444",
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  statusBtn: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusBtnText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteBtnText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  approvalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  approvalIcon: { fontSize: 13, fontWeight: "800", marginTop: 1 },
  approvalLabel: { fontSize: 12, fontWeight: "700" },
  approvalNote: { fontSize: 10, color: "#64748B", marginTop: 2 },
  availBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 10,
  },
  availOn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  availOff: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  availIcon: { fontSize: 16 },
  availInfo: { flex: 1 },
  availLabel: { fontSize: 13, fontWeight: "700" },
  availHint: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  availPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#15803D",
  },
  nonVegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    borderWidth: 1.5,
    borderColor: "#B91C1C",
  },
});
