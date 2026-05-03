import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useSuperAdmin } from "../../src/hooks/useSuperAdmin";
import AppSectionHeader from "../../src/components/AppSectionHeader";

interface StatCardProps {
  emoji: string;
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
}

function StatCard({ emoji, value, label, color, bgColor }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SuperAdminDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const { stats, recentSocieties, loadStats, isLoading } = useSuperAdmin();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const statCards: StatCardProps[] = [
    {
      emoji: "🏘️",
      value: stats?.totalSocieties ?? "—",
      label: "Societies",
      color: "#007AFF",
      bgColor: "#EFF6FF",
    },
    {
      emoji: "🏪",
      value: stats?.totalBusinesses ?? "—",
      label: "Businesses",
      color: "#22C55E",
      bgColor: "#F0FDF4",
    },
    {
      emoji: "⏳",
      value: stats?.pendingVerifications ?? "—",
      label: "Pending",
      color: "#F59E0B",
      bgColor: "#FFFBEB",
    },
    {
      emoji: "👥",
      value: stats?.totalUsers ?? "—",
      label: "Users",
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        <AppSectionHeader
          title={`${user?.firstName || "Admin"} 👋`}
          subtitle="Good day"
          badge="Super Admin"
        />

        {/* Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </View>
        )}

        {/* Recent Societies */}
        <Text style={styles.sectionTitle}>Recent Societies</Text>
        {recentSocieties.length === 0 && !isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No societies yet. Add one from the Societies tab.
            </Text>
          </View>
        ) : (
          <View style={styles.societiesList}>
            {recentSocieties.map((society) => (
              <View key={society.id} style={styles.societyRow}>
                <View style={styles.societyIconBox}>
                  <Text style={styles.societyIconText}>🏘️</Text>
                </View>
                <View style={styles.societyInfo}>
                  <Text style={styles.societyName}>{society.name}</Text>
                  <Text style={styles.societyMeta}>
                    {society.city}, {society.state}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    society.status === "active"
                      ? styles.statusActive
                      : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      society.status === "active"
                        ? styles.statusActiveText
                        : styles.statusInactiveText,
                    ]}
                  >
                    {society.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: "46%",
    borderRadius: 18,
    padding: 18,
  },
  statEmoji: {
    fontSize: 30,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  societiesList: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  societyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  societyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  societyIconText: {
    fontSize: 20,
  },
  societyInfo: {
    flex: 1,
  },
  societyName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  societyMeta: {
    fontSize: 13,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#F0FDF4",
  },
  statusInactive: {
    backgroundColor: "#FEF2F2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusActiveText: {
    color: "#16A34A",
  },
  statusInactiveText: {
    color: "#DC2626",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomPad: {
    height: 24,
  },
});
