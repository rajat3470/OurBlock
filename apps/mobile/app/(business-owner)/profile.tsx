import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useAuth } from "../../src/hooks/useAuth";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowIcon}>{icon}</Text>
      <View style={styles.infoRowContent}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BusinessOwnerProfile() {
  const { user } = useAppSelector((state) => state.auth);
  const { logoutUser, changePassword } = useAuth();
  const { businessProfile, loadBusinessProfile } = useBusinessOwner();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadBusinessProfile().catch(() => null);
  }, [loadBusinessProfile]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/(auth)/business-owner-login");
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(newPassword);
      Alert.alert("Success", "Password changed successfully.", [
        {
          text: "OK",
          onPress: () => {
            setShowChangePassword(false);
            setNewPassword("");
            setConfirmPassword("");
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || err?.message || "Failed to change password."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const verificationColor =
    businessProfile?.isVerified ? "#16A34A" : "#D97706";
  const verificationBg =
    businessProfile?.isVerified ? "#DCFCE7" : "#FFFBEB";
  const verificationLabel =
    businessProfile?.isVerified ? "✓ Verified Business" : "⏳ Pending Verification";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <AppSectionHeader
            title="Profile & Settings"
            subtitle="Account & business details"
          />

          {/* ── Owner identity card ─────────────────────────────────────── */}
          <View style={styles.identityCard}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarEmoji}>🏪</Text>
            </View>
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.phone ? (
              <Text style={styles.phone}>📞 {user.phone}</Text>
            ) : null}
          </View>

          {/* ── Business Details card ───────────────────────────────────── */}
          {businessProfile ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>🏬</Text>
                <Text style={styles.sectionHeaderTitle}>My Business</Text>
                <View style={[styles.verifiedPill, { backgroundColor: verificationBg }]}>
                  <Text style={[styles.verifiedPillText, { color: verificationColor }]}>
                    {verificationLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionBody}>
                <InfoRow icon="🏷️" label="Business Name"  value={businessProfile.name} />
                <InfoRow icon="🗂️" label="Category"       value={businessProfile.category} />
                <InfoRow icon="📝" label="Description"    value={businessProfile.description} />
                <InfoRow icon="📍" label="Address"        value={businessProfile.address} />
                <InfoRow icon="📞" label="Phone"          value={businessProfile.phone} />
                <InfoRow icon="✉️"  label="Email"          value={businessProfile.email} />
                <InfoRow icon="⭐" label="Rating"         value={businessProfile.rating ? `${businessProfile.rating} / 5 (${businessProfile.totalReviews ?? 0} reviews)` : null} />
                <InfoRow icon="🔖" label="Status"         value={businessProfile.status} />
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.noBusinessWrap}>
                <Text style={styles.noBusinessEmoji}>🏗️</Text>
                <Text style={styles.noBusinessText}>No business profile found.</Text>
                <Text style={styles.noBusinessSub}>Contact an admin to set up your business.</Text>
              </View>
            </View>
          )}

          {/* ── Change Password ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionRow}
              onPress={() => setShowChangePassword((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionRowIcon}>🔑</Text>
              <Text style={styles.sectionRowLabel}>Change Password</Text>
              <Text style={styles.sectionRowChevron}>
                {showChangePassword ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showChangePassword && (
              <View style={styles.changePasswordForm}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setPasswordError(""); }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94A3B8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                  Confirm New Password
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setPasswordError(""); }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94A3B8"
                />

                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.savePasswordBtn, isSaving ? styles.savePasswordBtnDisabled : null]}
                  onPress={handleChangePassword}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.savePasswordBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Sign out ────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Identity card
  identityCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 34 },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748B",
  },
  phone: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },

  // Generic section card
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  sectionHeaderIcon: { fontSize: 18 },
  sectionHeaderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  verifiedPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Business info rows
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    gap: 12,
  },
  infoRowIcon: { fontSize: 16, marginTop: 1 },
  infoRowContent: { flex: 1 },
  infoRowLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoRowValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    textTransform: "capitalize",
  },

  // No business state
  noBusinessWrap: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  noBusinessEmoji: { fontSize: 36, marginBottom: 10 },
  noBusinessText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  noBusinessSub: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },

  // Change password toggle row
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sectionRowIcon: { fontSize: 18, marginRight: 12 },
  sectionRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  sectionRowChevron: { fontSize: 12, color: "#94A3B8" },

  changePasswordForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
  },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 6 },
  savePasswordBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  savePasswordBtnDisabled: { opacity: 0.6 },
  savePasswordBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  logoutBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutBtnText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
});

