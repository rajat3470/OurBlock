import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import RatingModal from "@components/RatingModal";
import RefundModal from "@components/RefundModal";
import UserOrderCard from "@components/UserOrderCard";
import { ORDER_FILTERS, useUserOrders } from "@hooks/useUserOrders";
import content from "@/content/orders.json";

export default function UserOrders() {
  const insets = useSafeAreaInsets();
  const {
    orders,
    isLoading,
    activeFilter,
    setActiveFilter,
    filteredOrders,
    now,
    ratingOrder,
    refundOrder,
    setRatingOrder,
    setRefundOrder,
    handleReorder,
    handleCancel,
    refresh,
    openOrderDetail,
    goToHome,
    closeRating,
    closeRefund,
    handleRatingSubmitted,
    handleRefundSubmitted,
  } = useUserOrders();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0E9F6E", "#0891B2"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{content.header.subtitle}</Text>
      </LinearGradient>

      <View style={styles.filterRow}>
        {ORDER_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterBtn,
              activeFilter === filter.key ? styles.filterBtnActive : null,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === filter.key ? styles.filterLabelActive : null,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0E9F6E" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserOrderCard
              order={item}
              now={now}
              onPress={openOrderDetail}
              onCancel={handleCancel}
              onReorder={handleReorder}
              onRate={setRatingOrder}
              onRefund={setRefundOrder}
            />
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={refresh}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={goToHome}>
                <Text style={styles.browseBtnText}>{content.empty.browse}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {ratingOrder ? (
        <RatingModal
          visible
          orderId={ratingOrder.id}
          businessId={ratingOrder.businessId}
          businessName={(ratingOrder as any).businessName ?? content.card.defaultShop}
          onClose={closeRating}
          onSubmitted={handleRatingSubmitted}
        />
      ) : null}

      {refundOrder ? (
        <RefundModal
          visible
          orderId={refundOrder.id}
          orderAmount={(refundOrder as any).finalAmount ?? 0}
          businessName={(refundOrder as any).businessName ?? content.card.defaultShop}
          onClose={closeRefund}
          onSubmitted={handleRefundSubmitted}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  filterBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterBtnActive: { backgroundColor: "#0E9F6E", borderColor: "#0E9F6E" },
  filterLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  filterLabelActive: { color: "#FFFFFF" },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyWrap: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E9F6E",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155" },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  browseBtn: {
    marginTop: 8,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  browseBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});
