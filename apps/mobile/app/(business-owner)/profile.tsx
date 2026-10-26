import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useBusinessOwnerProfile } from "@hooks/useBusinessOwnerProfile";
import { useAppDispatch } from "@hooks/useRedux";
import { setUser } from "@store/slices/authSlice";
import { userAppService } from "@services/userAppService";
import { authStateService } from "@services/authStateService";
import { ShopImagePicker } from "@/components/business-owner/ShopImagePicker";
import content from "@/content/boProfile.json";

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
  const dispatch = useAppDispatch();
  const [editingName, setEditingName] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const {
    user,
    businessProfile,
    businessStatus,
    insets,
    verificationMeta,
    showChangePassword,
    setShowChangePassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    setPasswordError,
    isSaving,
    showSettings,
    setShowSettings,
    settingsMinOrder,
    setSettingsMinOrder,
    settingsDeliveryTime,
    setSettingsDeliveryTime,
    settingsPrepTime,
    setSettingsPrepTime,
    settingsDeliveryFee,
    setSettingsDeliveryFee,
    settingsTags,
    setSettingsTags,
    isSavingSettings,
    isUploadingShopImage,
    handleLogout,
    handleSaveSettings,
    handleUpdateShopImage,
    handleChangePassword,
  } = useBusinessOwnerProfile();

  const startEditName = useCallback(() => {
    setEditFullName(`${user?.firstName || ""} ${user?.lastName || ""}`.trim());
    setEditingName(true);
  }, [user]);

  const handleSaveName = useCallback(async () => {
    const parts = editFullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || firstName;

    setSavingName(true);
    try {
      const updatedUser = await userAppService.updateProfile({ firstName, lastName } as any);
      dispatch(setUser(updatedUser));
      await authStateService.updateUser(updatedUser);
      setEditingName(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  }, [editFullName, dispatch]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={["#084C3D", "#0B2E22"]}
            style={[styles.hero, { paddingTop: insets.top + 28 }]}
          >
            <View style={styles.avatarBox}>
              <Text style={styles.avatarEmoji}>{content.hero.emoji}</Text>
            </View>
            {editingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.editNameInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoFocus
                  autoCapitalize="words"
                />
                <TouchableOpacity onPress={handleSaveName} disabled={savingName} style={styles.editNameBtn}>
                  {savingName ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={28} color="#4ADE80" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)} style={styles.editNameBtn}>
                  <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={startEditName} style={styles.nameRow}>
                <Text style={styles.heroName}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Tap to add your name"}
                </Text>
                <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
            <Text style={styles.heroEmail}>{user?.email}</Text>
            {user?.phone ? (
              <Text style={styles.heroPhone}>{user.phone}</Text>
            ) : null}
          </LinearGradient>

          {/* ── Business Details card ───────────────────────────────────── */}
          {businessProfile ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>{content.business.sectionIcon}</Text>
                <Text style={styles.sectionHeaderTitle}>{content.business.sectionTitle}</Text>
                <View style={[styles.verifiedPill, { backgroundColor: verificationMeta.bg }]}>
                  <Text style={[styles.verifiedPillText, { color: verificationMeta.color }]}>
                    {verificationMeta.label}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionBody}>
                <ShopImagePicker
                  uri={businessProfile?.imageUrl || null}
                  onImageSelected={handleUpdateShopImage}
                  loading={isUploadingShopImage}
                  label="Shop Image"
                />
                <InfoRow icon="🏷️" label={content.business.rows.name}  value={businessProfile.name} />
                <InfoRow icon="🗂️" label={content.business.rows.category}       value={businessProfile.category} />
                <InfoRow icon="📝" label={content.business.rows.description}    value={businessProfile.description} />
                <InfoRow icon="📍" label={content.business.rows.address}        value={businessProfile.address} />
                <InfoRow icon="📞" label={content.business.rows.phone}          value={businessProfile.phone} />
                <InfoRow icon="✉️"  label={content.business.rows.email}          value={businessProfile.email} />
                <InfoRow icon="⭐" label={content.business.rows.rating}         value={businessProfile.rating ? content.business.ratingValue.replace("{rating}", String(businessProfile.rating)).replace("{reviews}", String(businessProfile.totalReviews ?? 0)) : null} />
                <InfoRow icon="🔖" label={content.business.rows.status}         value={businessStatus ? businessStatus.charAt(0).toUpperCase() + businessStatus.slice(1) : businessProfile.status} />
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.noBusinessWrap}>
                <Text style={styles.noBusinessEmoji}>{content.business.noProfileEmoji}</Text>
                <Text style={styles.noBusinessText}>{content.business.noProfileTitle}</Text>
                <Text style={styles.noBusinessSub}>{content.business.noProfileSub}</Text>
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
                <Text style={styles.sectionRowIcon}>{content.settings.icon}</Text>
                <Text style={styles.sectionRowLabel}>{content.settings.label}</Text>
                <Text style={styles.sectionRowChevron}>
                  {showSettings ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showSettings && (
                <View style={styles.changePasswordForm}>
                  <Text style={styles.fieldLabel}>{content.settings.minOrder}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={content.settings.placeholders.minOrder}
                    value={settingsMinOrder}
                    onChangeText={setSettingsMinOrder}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{content.settings.deliveryTime}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={content.settings.placeholders.deliveryTime}
                    value={settingsDeliveryTime}
                    onChangeText={setSettingsDeliveryTime}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{content.settings.prepTime}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={content.settings.placeholders.prepTime}
                    value={settingsPrepTime}
                    onChangeText={setSettingsPrepTime}
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{content.settings.deliveryFee}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={content.settings.placeholders.deliveryFee}
                    value={settingsDeliveryFee}
                    onChangeText={setSettingsDeliveryFee}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{content.settings.tags}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={content.settings.placeholders.tags}
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
                      <Text style={styles.savePasswordBtnText}>{content.settings.save}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {/* ── Bank Details ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionRow}
              onPress={() => router.push("/(business-owner)/bank-details")}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionRowIcon}>🏦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionRowLabel}>Bank Details</Text>
                <Text style={[
                  styles.sectionRowSub,
                  (businessProfile as any)?.bankDetails?.verificationStatus === "verified" && { color: "#059669" },
                  (businessProfile as any)?.bankDetails?.verificationStatus === "rejected" && { color: "#DC2626" },
                ]}>
                  {(businessProfile as any)?.bankDetails?.verificationStatus === "verified"
                    ? "Verified"
                    : (businessProfile as any)?.bankDetails?.verificationStatus === "pending"
                      ? "Pending verification"
                      : (businessProfile as any)?.bankDetails?.verificationStatus === "rejected"
                        ? "Rejected — update required"
                        : "Not added yet"}
                </Text>
              </View>
              <Text style={styles.sectionRowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Delivery Partners ───────────────────────────────────────── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionRow}
              onPress={() => router.push("/(business-owner)/delivery-partners")}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionRowIcon}>{content.deliveryPartners.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionRowLabel}>{content.deliveryPartners.label}</Text>
                <Text style={styles.sectionRowSub}>{content.deliveryPartners.subtitle}</Text>
              </View>
              <Text style={styles.sectionRowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Change Password ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionRow}
              onPress={() => setShowChangePassword((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionRowIcon}>{content.password.icon}</Text>
              <Text style={styles.sectionRowLabel}>{content.password.label}</Text>
              <Text style={styles.sectionRowChevron}>
                {showChangePassword ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showChangePassword && (
              <View style={styles.changePasswordForm}>
                <Text style={styles.fieldLabel}>{content.password.newPassword}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={content.password.placeholders.newPassword}
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setPasswordError(""); }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94A3B8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                  {content.password.confirmPassword}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={content.password.placeholders.confirmPassword}
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
                    <Text style={styles.savePasswordBtnText}>{content.password.update}</Text>
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
              <Text style={styles.logoutBtnText}>{content.logout.buttonText}</Text>
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
    backgroundColor: "#FBF6EC",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarEmoji: { fontSize: 36 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  editNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.5)",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  editNameBtn: {
    padding: 2,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
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
  sectionRowSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
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
    backgroundColor: "#084C3D",
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

