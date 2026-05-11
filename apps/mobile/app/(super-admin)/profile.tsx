
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useAuth } from "../../src/hooks/useAuth";

interface InfoRow {
  label: string;
  value: string | undefined;
}

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
}

export default function SuperAdminProfileScreen() {
  const { user } = useAppSelector((state) => state.auth);
  const { logoutUser } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/(auth)/super-admin-login");
        },
      },
    ]);
  };

  const accountInfo: InfoRow[] = [
    { label: "First Name", value: user?.firstName },
    { label: "Last Name", value: user?.lastName },
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "Role", value: "Super Admin" },
    { label: "Status", value: user?.status },
    {
      label: "Email Verified",
      value: user?.isEmailVerified ? "Yes ✓" : "No",
    },
  ];

  const menuItems: MenuItem[] = [
    { icon: "🔒", label: "Change Password", onPress: () => {} },
    { icon: "🔔", label: "Notification Settings", onPress: () => {} },
    { icon: "ℹ️", label: "About OurBlock", onPress: () => {} },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Blue gradient hero */}
        <LinearGradient
          colors={["#2563EB", "#4F46E5"]}
          style={[styles.hero, { paddingTop: insets.top + 28 }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🔐</Text>
          </View>
          <Text style={styles.fullName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Super Admin</Text>
          </View>
        </LinearGradient>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>
          {accountInfo.map((row, idx) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                idx === accountInfo.length - 1 ? styles.infoRowLast : null,
              ]}
            >
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value ?? "—"}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                idx === menuItems.length - 1 ? styles.menuItemLast : null,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>OurBlock Admin v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  // Blue gradient hero
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarEmoji: {
    fontSize: 38,
  },
  fullName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  adminBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  adminBadgeText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoRowLast: {
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
    textTransform: "capitalize",
    maxWidth: "55%",
    textAlign: "right",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuItemLast: {
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  menuArrow: {
    fontSize: 22,
    color: "#94A3B8",
  },
  logoutBtn: {
    backgroundColor: "#FEF2F2",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  logoutBtnText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700",
  },
  version: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    paddingBottom: 130,
  },
});
