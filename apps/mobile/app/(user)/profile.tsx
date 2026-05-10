
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { authStateService } from "../../src/services/authStateService";
import { userAppService } from "../../src/services/userAppService";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useAppDispatch } from "../../src/hooks/useRedux";
import { useAuth } from "../../src/hooks/useAuth";
import { setUser } from "../../src/store/slices/authSlice";

export default function UserProfile() {
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
    <SafeAreaView style={styles.container}>
      <AppSectionHeader title="Profile" subtitle="Resident account settings" />
      <View style={styles.content}>
        <View style={styles.avatarWrap}>
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarEmoji}>👤</Text>
          )}
        </View>
        <TouchableOpacity style={styles.actionGhostBtn} onPress={handlePickProfilePhoto} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.actionGhostText}>Upload Profile Photo</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.actionsList}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(user)/addresses") }>
            <Text style={styles.actionBtnText}>Manage Addresses</Text>
          </TouchableOpacity>
          {user?.isPhoneVerified ? (
            <View style={[styles.actionBtn, styles.verifiedBtn]}>
              <Text style={styles.verifiedBtnText}>Phone Number Verified</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(user)/verify-phone") }>
              <Text style={styles.actionBtnText}>Verify Phone Number</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 36,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#93C5FD",
    marginBottom: 10,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  actionGhostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  actionGhostText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  email: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
  },
  actionsList: {
    width: "100%",
    marginTop: 28,
    gap: 10,
  },
  actionBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  verifiedBtn: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  verifiedBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#047857",
  },
  footer: {
    padding: 24,
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
