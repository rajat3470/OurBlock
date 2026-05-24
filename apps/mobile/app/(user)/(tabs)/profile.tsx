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

export default function UserProfile() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { logoutUser } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        onPress: async () => {
          await logoutUser();
          router.replace("/(auth)/user-login");
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
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
});
