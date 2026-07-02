import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { authStateService } from "../../../src/services/authStateService";
import { userAppService } from "../../../src/services/userAppService";
import { useAppSelector, useAppDispatch } from "../../../src/hooks/useRedux";
import { useAuth } from "../../../src/hooks/useAuth";
import { setUser } from "../../../src/store/slices/authSlice";
import { useFeatureFlags } from "../../../src/hooks/useFeatureFlags";
import { featureFlagsService } from "../../../src/services/featureFlagsService";
import {
  setFeatureFlagsError,
  setFlags,
  setLocalOverride,
  setRefreshing,
} from "../../../src/store/slices/featureFlagsSlice";
import type { FeatureFlags } from "../../../src/constants/featureFlags";

export default function UserProfile() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const featureFlags = useFeatureFlags();
  const { logoutUser } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [devDrawerVisible, setDevDrawerVisible] = useState(false);

  const handleRefreshFeatureFlags = async () => {
    dispatch(setRefreshing(true));
    try {
      const snapshot = await featureFlagsService.refresh();
      dispatch(setFlags(snapshot));
      dispatch(setFeatureFlagsError(null));
      toast.show("Feature flags refreshed from Firebase.", { type: "success" });
    } catch (error: any) {
      dispatch(setFeatureFlagsError(error?.message || "Failed to refresh feature flags"));
      toast.show(error?.message || "Failed to refresh feature flags", { type: "danger" });
    } finally {
      dispatch(setRefreshing(false));
    }
  };

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

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // Navigate first, then clean up — prevents double-navigation race
          // that crashes on iOS when RoleGate's <Redirect> and router.replace
          // both fire simultaneously after logout() is dispatched.
          router.replace("/(auth)/user-login");
          logoutUser();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero header */}
        <LinearGradient colors={["#DC2626", "#991B1B"]} style={[styles.hero, { paddingTop: insets.top + 32 }]}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickProfilePhoto} disabled={uploadingPhoto}>
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#DC2626" />
            )}
            <View style={styles.cameraOverlay}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.heroName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
        </LinearGradient>

        {/* Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>

          <TouchableOpacity style={styles.row} onPress={() => router.push("/(user)/addresses")}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="location-outline" size={20} color="#DC2626" />
            </View>
            <Text style={styles.rowLabel}>Manage Addresses</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {user?.isPhoneVerified ? (
            <View style={styles.row}>
              <View style={[styles.rowIconWrap, styles.rowIconGreen]}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <Text style={styles.rowLabel}>Phone Number Verified</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => router.push("/(user)/verify-phone")}>
              <View style={[styles.rowIconWrap, styles.rowIconAmber]}>
                <Ionicons name="call-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.rowLabel}>Verify Phone Number</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          {__DEV__ ? (
            <>
              <TouchableOpacity style={styles.row} onPress={() => setDevDrawerVisible(true)}>
                <View style={styles.rowIconWrap}>
                  <Ionicons name="construct-outline" size={20} color="#DC2626" />
                </View>
                <Text style={styles.rowLabel}>Developer Feature Flags</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          ) : null}

          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {__DEV__ ? (
        <Modal
          visible={devDrawerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDevDrawerVisible(false)}
        >
          <View style={styles.devDrawerBackdrop}>
            <View style={styles.devDrawerCard}>
              <View style={styles.devDrawerHeader}>
                <Text style={styles.devDrawerTitle}>Feature Flags (Dev)</Text>
                <TouchableOpacity onPress={() => setDevDrawerVisible(false)}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.devDrawerMeta}>
                Fetch status: {featureFlags.lastFetchStatus}
              </Text>
              <Text style={styles.devDrawerMeta}>
                Last fetch: {featureFlags.lastFetchTime ? new Date(featureFlags.lastFetchTime).toLocaleString() : "never"}
              </Text>
              {featureFlags.error ? (
                <Text style={styles.devDrawerError}>{featureFlags.error}</Text>
              ) : null}

              {(
                [
                  ["ads.enabled", "adsEnabled"],
                  ["ads.nativeFeed.enabled", "adsNativeFeedEnabled"],
                  ["ads.nativeListing.enabled", "adsNativeListingEnabled"],
                  ["ads.rewarded.enabled", "adsRewardedEnabled"],
                ] as [string, keyof FeatureFlags][]
              ).map(([label, key]) => (
                <View style={styles.devFlagRow} key={key}>
                  <Text style={styles.devFlagLabel}>{label}</Text>
                  <Switch
                    value={featureFlags.values[key] as boolean}
                    onValueChange={(v) => { dispatch(setLocalOverride({ key, value: v })); }}
                    trackColor={{ false: "#D1D5DB", true: "#DC2626" }}
                  />
                </View>
              ))}

              <Text style={styles.devDrawerMeta}>ads.rewarded.minRs: {featureFlags.values.adsRewardedMinRs}</Text>
              <Text style={styles.devDrawerMeta}>ads.rewarded.maxRs: {featureFlags.values.adsRewardedMaxRs}</Text>
              <Text style={styles.devDrawerMeta}>ads.density.everyNthCard: {featureFlags.values.adsDensityEveryNthCard}</Text>
              <Text style={styles.devDrawerMeta}>
                ads.rewarded.maxClaimsPerDay: {featureFlags.values.adsRewardedMaxClaimsPerDay}
              </Text>

              <TouchableOpacity
                style={[styles.devRefreshBtn, featureFlags.isRefreshing && styles.devRefreshBtnDisabled]}
                onPress={handleRefreshFeatureFlags}
                disabled={featureFlags.isRefreshing}
              >
                {featureFlags.isRefreshing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.devRefreshBtnText}>Refresh From Firebase</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  scrollContent: { paddingBottom: 130 },
  hero: {
    paddingTop: 32,
    paddingBottom: 36,
    alignItems: "center",
    gap: 6,
  },
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
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconGreen: { backgroundColor: "#F0FDF4" },
  rowIconAmber: { backgroundColor: "#FFFBEB" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },
  verifiedBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  signOutText: { fontSize: 15, fontWeight: "700", color: "#DC2626" },
  devDrawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.55)",
    justifyContent: "flex-end",
  },
  devDrawerCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
  devDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  devDrawerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  devDrawerMeta: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  devDrawerError: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "600",
  },
  devFlagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  devFlagLabel: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  devRefreshBtn: {
    marginTop: 8,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  devRefreshBtnDisabled: {
    opacity: 0.7,
  },
  devRefreshBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
