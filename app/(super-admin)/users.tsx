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
import { User } from "../../src/types/index";
import { useSuperAdmin } from "../../src/hooks/useSuperAdmin";

type UserTab = "all" | "active" | "suspended";

const TABS: { key: UserTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
];

const ROLE_LABELS: Record<string, string> = {
  superAdmin: "Super Admin",
  businessOwner: "Business Owner",
  user: "Resident",
};

const ROLE_EMOJI: Record<string, string> = {
  superAdmin: "🔐",
  businessOwner: "🏪",
  user: "👤",
};

export default function UsersScreen() {
  const { allUsers, loadUsers, suspendUser, activateUser, isLoading } =
    useSuperAdmin();

  const [activeTab, setActiveTab] = useState<UserTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const getList = () => {
    let list: User[] =
      activeTab === "active"
        ? allUsers.filter((u) => u.status === "active")
        : activeTab === "suspended"
        ? allUsers.filter((u) => u.status === "suspended")
        : allUsers;

    if (searchQuery) {
      list = list.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  };

  const handleSuspend = (user: User) => {
    Alert.alert(
      "Suspend User",
      `Suspend "${user.firstName} ${user.lastName}"? They won't be able to access the app.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: () => suspendUser(user.id),
        },
      ]
    );
  };

  const handleActivate = (user: User) => {
    Alert.alert(
      "Activate User",
      `Restore access for "${user.firstName} ${user.lastName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Activate", onPress: () => activateUser(user.id) },
      ]
    );
  };

  const tabCount = (tab: UserTab) => {
    if (tab === "active") return allUsers.filter((u) => u.status === "active").length;
    if (tab === "suspended") return allUsers.filter((u) => u.status === "suspended").length;
    return allUsers.length;
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarEmoji}>
            {ROLE_EMOJI[item.role] ?? "👤"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === "active"
              ? styles.statusActive
              : item.status === "suspended"
              ? styles.statusSuspended
              : styles.statusInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "active"
                ? styles.activeText
                : item.status === "suspended"
                ? styles.suspendedText
                : styles.inactiveText,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleLabel}>
            {ROLE_LABELS[item.role] ?? item.role}
          </Text>
        </View>
        <Text style={styles.verifiedLabel}>
          {item.isEmailVerified ? "✉️ Verified" : "✉️ Unverified"}
        </Text>
      </View>

      {item.role !== "superAdmin" && (
        <View style={styles.actions}>
          {item.status === "active" ? (
            <TouchableOpacity
              style={styles.suspendBtn}
              onPress={() => handleSuspend(item)}
            >
              <Text style={styles.suspendBtnText}>Suspend</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.activateBtn}
              onPress={() => handleActivate(item)}
            >
              <Text style={styles.activateBtnText}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
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
              {tab.label} ({tabCount(tab.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIconText}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {isLoading && allUsers.length === 0 ? (
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
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different filter or search term
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
    flexWrap: "wrap",
  },
  tab: {
    paddingHorizontal: 14,
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
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 1,
  },
  userPhone: {
    fontSize: 13,
    color: "#94A3B8",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#F0FDF4",
  },
  statusSuspended: {
    backgroundColor: "#FEF2F2",
  },
  statusInactive: {
    backgroundColor: "#F8FAFC",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  activeText: {
    color: "#16A34A",
  },
  suspendedText: {
    color: "#DC2626",
  },
  inactiveText: {
    color: "#94A3B8",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleLabel: {
    fontSize: 11,
    color: "#007AFF",
    fontWeight: "600",
  },
  verifiedLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  suspendBtn: {
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  suspendBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  activateBtn: {
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#22C55E",
    alignItems: "center",
  },
  activateBtnText: {
    color: "#16A34A",
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
