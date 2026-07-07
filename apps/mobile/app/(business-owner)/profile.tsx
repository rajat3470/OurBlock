import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { useAuth } from "../../src/hooks/useAuth";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { businessOwnerService } from "../../src/services/businessOwnerService";
import { userAppService } from "../../src/services/userAppService";
import * as ImagePicker from "expo-image-picker";
import { useToast } from "react-native-toast-notifications";
import { Ionicons } from "@expo/vector-icons";
import { setUser } from "../../src/store/slices/authSlice";
import { authStateService } from "../../src/services/authStateService";


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
  const toast = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const dispatch = useAppDispatch();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Business settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMinOrder, setSettingsMinOrder] = useState("");
  const [settingsDeliveryTime, setSettingsDeliveryTime] = useState("");
  const [settingsPrepTime, setSettingsPrepTime] = useState("");
  const [settingsDeliveryFee, setSettingsDeliveryFee] = useState("");
  const [settingsTags, setSettingsTags] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    loadBusinessProfile().catch(() => null);
  }, [loadBusinessProfile]);

  // Populate settings fields when businessProfile loads
  useEffect(() => {
    if (businessProfile) {
      setSettingsMinOrder(String(businessProfile.minimumOrderAmount ?? ""));
      setSettingsDeliveryTime(businessProfile.estimatedDeliveryTime ?? "");
      setSettingsPrepTime(businessProfile.preparationTime ?? "");
      setSettingsDeliveryFee(String(businessProfile.deliveryFee ?? ""));
      setSettingsTags(Array.isArray(businessProfile.tags) ? businessProfile.tags.join(", ") : "");
    }
  }, [businessProfile]);

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

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const minOrder = settingsMinOrder.trim() !== "" ? Number(settingsMinOrder) : undefined;
      const fee = settingsDeliveryFee.trim() !== "" ? Number(settingsDeliveryFee) : undefined;
      const tags = settingsTags.trim()
        ? settingsTags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;
      await businessOwnerService.updateBusinessSettings({
        minimumOrderAmount: minOrder,
        estimatedDeliveryTime: settingsDeliveryTime.trim() || undefined,
        preparationTime: settingsPrepTime.trim() || undefined,
        deliveryFee: fee,
        tags,
      });
      await loadBusinessProfile().catch(() => null);
      Alert.alert("Saved", "Business settings updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || err?.message || "Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
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

  const insets = useSafeAreaInsets();


  const handlePickProfilePhoto = async () => {
    if (!user?.id) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.show("Please allow photo library access.", { type: "warning" });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      setUploadingPhoto(true);
      const selected = result.assets[0];
      if (!selected.base64) {
        toast.show("Could not read selected image.", { type: "danger" });
        return;
      }
      const mimeType = selected.mimeType || "image/jpeg";
      const imageUrl = `data:${mimeType};base64,${selected.base64}`;
      const updatedUser = await userAppService.updateProfile({ profileImageUrl: imageUrl });
      dispatch(setUser(updatedUser));
      await authStateService.updateUser(updatedUser);
      toast.show("Profile photo updated.", { type: "success" });
    } catch (error: any) {
      toast.show(error?.message || "Failed to upload profile image", { type: "danger" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={["#16A34A", "#0A7D55"]}
            style={[styles.hero, { paddingTop: insets.top + 28 }]}
          >

            <TouchableOpacity style={styles.avatarWrap} onPress={handlePickProfilePhoto} disabled={uploadingPhoto}>
              {user?.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color="#0E9F6E" />
              )}
              <View style={styles.cameraOverlay}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>


            <Text style={styles.heroName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.heroEmail}>{user?.email}</Text>
            {user?.phone ? (
              <Text style={styles.heroPhone}>{user.phone}</Text>
            ) : null}
          </LinearGradient>

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
                <InfoRow icon="🏷️" label="Business Name" value={businessProfile.name} />
                <InfoRow icon="🗂️" label="Category" value={businessProfile.category} />
                <InfoRow icon="📝" label="Description" value={businessProfile.description} />
                <InfoRow icon="📍" label="Address" value={businessProfile.address} />
                <InfoRow icon="📞" label="Phone" value={businessProfile.phone} />
                <InfoRow icon="✉️" label="Email" value={businessProfile.email} />
                <InfoRow icon="⭐" label="Rating" value={businessProfile.rating ? `${businessProfile.rating} / 5 (${businessProfile.totalReviews ?? 0} reviews)` : null} />
                <InfoRow icon="🔖" label="Status" value={businessProfile.status} />
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

          {/* ── Business Settings ───────────────────────────────────────── */}
          {businessProfile ? (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionRow}
                onPress={() => setShowSettings((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionRowIcon}>⚙️</Text>
                <Text style={styles.sectionRowLabel}>Business Settings</Text>
                <Text style={styles.sectionRowChevron}>
                  {showSettings ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showSettings && (
                <View style={styles.changePasswordForm}>
                  <Text style={styles.fieldLabel}>Minimum Order Amount (Rs)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 100"
                    value={settingsMinOrder}
                    onChangeText={setSettingsMinOrder}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Estimated Delivery Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 30-40 mins"
                    value={settingsDeliveryTime}
                    onChangeText={setSettingsDeliveryTime}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Preparation Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 15-20 mins"
                    value={settingsPrepTime}
                    onChangeText={setSettingsPrepTime}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Delivery Fee (Rs, 0 = free)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 30"
                    value={settingsDeliveryFee}
                    onChangeText={setSettingsDeliveryFee}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Cuisine Tags (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Chinese, Veg, Fast Food"
                    value={settingsTags}
                    onChangeText={setSettingsTags}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                  />

                  <TouchableOpacity
                    style={[styles.savePasswordBtn, isSavingSettings ? styles.savePasswordBtnDisabled : null]}
                    onPress={handleSaveSettings}
                    disabled={isSavingSettings}
                    activeOpacity={0.8}
                  >
                    {isSavingSettings ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.savePasswordBtnText}>Save Settings</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // avatarBox: {
  //   width: 80,
  //   height: 80,
  //   borderRadius: 40,
  //   backgroundColor: "rgba(255,255,255,0.2)",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   marginBottom: 12,
  //   borderWidth: 2,
  //   borderColor: "rgba(255,255,255,0.4)",
  // },

  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
  },


  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  cameraOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0E9F6E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarContainer: {
    alignSelf: "center",
    position: "relative",
  },

  // avatarBox: {
  //   width: 110,
  //   height: 110,
  //   borderRadius: 55,
  //   backgroundColor: "#F2F2F2",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },

  // avatarEmoji: {
  //   fontSize: 50,
  // },

  cameraIconContainer: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4CAF50", // Change to your theme color
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    elevation: 4, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  heroEmail: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  heroPhone: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },

  // Generic section card
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
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
    paddingTop: 24,
    paddingBottom: 130,
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

