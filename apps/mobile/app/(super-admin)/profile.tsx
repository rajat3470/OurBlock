
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  const { logoutUser, changePassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(newPassword);
      Alert.alert("Success", "Your password has been updated.");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      icon: "🔒",
      label: "Change Password",
      onPress: () => setPasswordModalVisible(true),
    },
    {
      icon: "🔔",
      label: "Notification Settings",
      onPress: () => Alert.alert("Coming soon", "Notification settings will be available in a future update."),
    },
    {
      icon: "ℹ️",
      label: "About mohallaMitr",
      onPress: () => Alert.alert("About", "mohallaMitr Admin v1.0.0"),
    },
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

        <Text style={styles.version}>mohallaMitr Admin v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !passwordLoading && setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>
              Choose a new password with at least 8 characters.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPasswordModalVisible(false)}
                disabled={passwordLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, passwordLoading && styles.modalSaveBtnDisabled]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 19,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalSaveBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#2563EB",
  },
  modalSaveBtnDisabled: {
    opacity: 0.6,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
