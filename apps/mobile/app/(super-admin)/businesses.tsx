import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Business } from "../../src/types/index";
import { useSuperAdmin } from "../../src/hooks/useSuperAdmin";
import { BUSINESS_CATEGORY_LABELS } from "../../src/constants/index";

type FilterTab = "pending" | "verified" | "all";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "all", label: "All" },
];

export default function BusinessesScreen() {
  const {
    pendingBusinesses,
    allBusinesses,
    loadBusinesses,
    verifyBusiness,
    rejectBusiness,
    isLoading,
  } = useSuperAdmin();

  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinesses();
    setRefreshing(false);
  };

  const getList = () => {
    let list: Business[] =
      activeTab === "pending"
        ? pendingBusinesses
        : activeTab === "verified"
        ? allBusinesses.filter((b) => b.isVerified)
        : allBusinesses;

    if (searchQuery) {
      list = list.filter((b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  };

  const handleVerify = (item: Business) => {
    Alert.alert("Verify Business", `Approve "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Verify", onPress: () => verifyBusiness(item.id) },
    ]);
  };

  const handleReject = (item: Business) => {
    Alert.alert(
      "Reject Business",
      `Reject "${item.name}"? The owner will be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => rejectBusiness(item.id),
        },
      ]
    );
  };

  const getCategoryLabel = (cat: string) =>
    BUSINESS_CATEGORY_LABELS[cat as keyof typeof BUSINESS_CATEGORY_LABELS] ??
    cat;

  const renderItem = ({ item }: { item: Business }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🏪</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
          <Text style={styles.cardMeta}>{item.address}</Text>
        </View>
        <View
          style={[
            styles.verifyBadge,
            item.isVerified ? styles.verifiedBg : styles.pendingBg,
          ]}
        >
          <Text
            style={[
              styles.verifyBadgeText,
              item.isVerified ? styles.verifiedColor : styles.pendingColor,
            ]}
          >
            {item.isVerified ? "Verified" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.contactRow}>
        <Text style={styles.contactItem}>📞 {item.phone}</Text>
        {item.email ? (
          <Text style={styles.contactItem}>✉️ {item.email}</Text>
        ) : null}
      </View>

      {!item.isVerified && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => handleVerify(item)}
          >
            <Text style={styles.verifyBtnText}>✓ Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(item)}
          >
            <Text style={styles.rejectBtnText}>✗ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const tabCount = (tab: FilterTab) => {
    if (tab === "pending") return pendingBusinesses.length;
    if (tab === "verified") return allBusinesses.filter((b) => b.isVerified).length;
    return allBusinesses.length;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Businesses</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key ? styles.tabActive : null]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key ? styles.tabTextActive : null,
              ]}
            >
              {tab.label}
              {tabCount(tab.key) > 0 ? ` (${tabCount(tab.key)})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIconText}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search businesses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {isLoading && allBusinesses.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={getList()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === "pending"
                  ? "No Pending Businesses"
                  : "No Businesses Found"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "pending"
                  ? "All businesses are verified!"
                  : "Try a different filter or search"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIconText: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  verifyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedBg: {
    backgroundColor: "#F0FDF4",
  },
  pendingBg: {
    backgroundColor: "#FFFBEB",
  },
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  verifiedColor: {
    color: "#16A34A",
  },
  pendingColor: {
    color: "#D97706",
  },
  contactRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  contactItem: {
    fontSize: 13,
    color: "#64748B",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  verifyBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    alignItems: "center",
  },
  verifyBtnText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  rejectBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
