import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useUserApp } from "../../src/hooks/useUserApp";

export default function UserHome() {
  const { user } = useAppSelector((state) => state.auth);
  const {
    societies,
    selectedSocietyId,
    featuredProducts,
    stats,
    isLoading,
    initializeHome,
    selectSociety,
  } = useUserApp();

  useEffect(() => {
    initializeHome().catch(() => null);
  }, [initializeHome]);

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader
        title={`${user?.firstName || "Resident"} 👋`}
        subtitle="Discover nearby shops"
        badge="Resident"
      />

      {isLoading && featuredProducts.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#D97706" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {!user?.isPhoneVerified ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Phone verification pending</Text>
              <Text style={styles.warningText}>
                You can browse now, but phone verification is mandatory before placing any order.
              </Text>
              <TouchableOpacity
                style={styles.warningBtn}
                onPress={() => router.push("/(user)/verify-phone")}
              >
                <Text style={styles.warningBtnText}>Verify Phone Number</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Select Society</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.societyRow}
          >
            {societies.map((society) => {
              const selected = selectedSocietyId === society.id;
              return (
                <TouchableOpacity
                  key={society.id}
                  style={[
                    styles.societyChip,
                    selected ? styles.societyChipActive : null,
                  ]}
                  onPress={() => selectSociety(society.id)}
                >
                  <Text
                    style={[
                      styles.societyLabel,
                      selected ? styles.societyLabelActive : null,
                    ]}
                  >
                    {society.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalBusinesses ?? 0}</Text>
              <Text style={styles.statLabel}>Shops</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.activeOrders ?? 0}</Text>
              <Text style={styles.statLabel}>Active Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.favoriteCount ?? 0}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Featured Products</Text>
          {featuredProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No featured products yet</Text>
              <Text style={styles.emptySubtitle}>
                Featured picks from your society will show up here.
              </Text>
            </View>
          ) : (
            <View style={styles.productList}>
              {featuredProducts.slice(0, 8).map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>{product.category}</Text>
                  </View>
                  <Text style={styles.productPrice}>Rs {product.price}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  warningCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9A3412",
  },
  warningText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#9A3412",
  },
  warningBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#EA580C",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  societyRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  societyChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  societyChipActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  societyLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  societyLabelActive: {
    color: "#FFFFFF",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  productList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  productMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D97706",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  bottomPad: {
    height: 20,
  },
});
