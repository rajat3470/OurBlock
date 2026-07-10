import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useUserProfile } from "@hooks/useUserProfile";
import type { FeatureFlags } from "@/constants/featureFlags";
import content from "@/content/profile.json";

const DEV_FLAGS: [string, keyof FeatureFlags][] = [
  ["ads.enabled", "adsEnabled"],
  ["ads.nativeFeed.enabled", "adsNativeFeedEnabled"],
  ["ads.nativeListing.enabled", "adsNativeListingEnabled"],
  ["ads.rewarded.enabled", "adsRewardedEnabled"],
];

export default function UserProfile() {
  const insets = useSafeAreaInsets();
  const {
    user,
    featureFlags,
    uploadingPhoto,
    devDrawerVisible,
    handleRefreshFeatureFlags,
    handlePickProfilePhoto,
    handleLogout,
    toggleFlag,
    openDevDrawer,
    closeDevDrawer,
    goToAddresses,
    goToVerifyPhone,
  } = useUserProfile();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero header */}
        <LinearGradient colors={["#0E9F6E", "#0891B2"]} style={[styles.hero, { paddingTop: insets.top + 32 }]}>
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
          <Text style={styles.heroName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
        </LinearGradient>

        {/* Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{content.account.label}</Text>

          <TouchableOpacity style={styles.row} onPress={goToAddresses}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="location-outline" size={20} color="#0E9F6E" />
            </View>
            <Text style={styles.rowLabel}>{content.account.manageAddresses}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {user?.isPhoneVerified ? (
            <View style={styles.row}>
              <View style={[styles.rowIconWrap, styles.rowIconGreen]}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <Text style={styles.rowLabel}>{content.account.phoneVerified}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>{content.account.verifiedBadge}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={goToVerifyPhone}>
              <View style={[styles.rowIconWrap, styles.rowIconAmber]}>
                <Ionicons name="call-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.rowLabel}>{content.account.verifyPhone}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          {__DEV__ ? (
            <>
              <TouchableOpacity style={styles.row} onPress={openDevDrawer}>
                <View style={styles.rowIconWrap}>
                  <Ionicons name="construct-outline" size={20} color="#0E9F6E" />
                </View>
                <Text style={styles.rowLabel}>{content.dev.menuLabel}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          ) : null}

          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.signOutText}>{content.signOut}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {__DEV__ ? (
        <Modal
          visible={devDrawerVisible}
          transparent
          animationType="slide"
          onRequestClose={closeDevDrawer}
        >
          <View style={styles.devDrawerBackdrop}>
            <View style={styles.devDrawerCard}>
              <View style={styles.devDrawerHeader}>
                <Text style={styles.devDrawerTitle}>{content.dev.title}</Text>
                <TouchableOpacity onPress={closeDevDrawer}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.devDrawerMeta}>
                {content.dev.fetchStatusLabel} {featureFlags.lastFetchStatus}
              </Text>
              <Text style={styles.devDrawerMeta}>
                {content.dev.lastFetchLabel} {featureFlags.lastFetchTime ? new Date(featureFlags.lastFetchTime).toLocaleString() : content.dev.never}
              </Text>
              {featureFlags.error ? (
                <Text style={styles.devDrawerError}>{featureFlags.error}</Text>
              ) : null}

              {DEV_FLAGS.map(([label, key]) => (
                <View style={styles.devFlagRow} key={key}>
                  <Text style={styles.devFlagLabel}>{label}</Text>
                  <Switch
                    value={featureFlags.values[key] as boolean}
                    onValueChange={(v) => toggleFlag(key, v)}
                    trackColor={{ false: "#D1D5DB", true: "#0E9F6E" }}
                  />
                </View>
              ))}

              <Text style={styles.devDrawerMeta}>{content.dev.minRsLabel} {featureFlags.values.adsRewardedMinRs}</Text>
              <Text style={styles.devDrawerMeta}>{content.dev.maxRsLabel} {featureFlags.values.adsRewardedMaxRs}</Text>
              <Text style={styles.devDrawerMeta}>{content.dev.densityLabel} {featureFlags.values.adsDensityEveryNthCard}</Text>
              <Text style={styles.devDrawerMeta}>
                {content.dev.maxClaimsLabel} {featureFlags.values.adsRewardedMaxClaimsPerDay}
              </Text>

              <TouchableOpacity
                style={[styles.devRefreshBtn, featureFlags.isRefreshing && styles.devRefreshBtnDisabled]}
                onPress={handleRefreshFeatureFlags}
                disabled={featureFlags.isRefreshing}
              >
                {featureFlags.isRefreshing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.devRefreshBtnText}>{content.dev.refresh}</Text>
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
  scrollContent: { paddingBottom: 24 },
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
    backgroundColor: "#0E9F6E",
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
    backgroundColor: "#ECFDF5",
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
    backgroundColor: "#0E9F6E",
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
