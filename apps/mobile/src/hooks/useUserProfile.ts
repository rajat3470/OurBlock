import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { authStateService } from "@services/authStateService";
import { userAppService } from "@services/userAppService";
import { featureFlagsService } from "@services/featureFlagsService";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { useAuth } from "@hooks/useAuth";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import { setUser } from "@store/slices/authSlice";
import {
  setFeatureFlagsError,
  setFlags,
  setLocalOverride,
  setRefreshing,
} from "@store/slices/featureFlagsSlice";
import type { FeatureFlags } from "@/constants/featureFlags";
import content from "@/content/profile.json";

/**
 * Encapsulates all logic for the customer profile screen: profile photo
 * upload, sign out, feature-flag dev tools, and navigation.
 */
export const useUserProfile = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const featureFlags = useFeatureFlags();
  const { logoutUser } = useAuth();

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [devDrawerVisible, setDevDrawerVisible] = useState(false);

  const handleRefreshFeatureFlags = useCallback(async () => {
    dispatch(setRefreshing(true));
    try {
      const snapshot = await featureFlagsService.refresh();
      dispatch(setFlags(snapshot));
      dispatch(setFeatureFlagsError(null));
      toast.show(content.toasts.flagsRefreshed, { type: "success" });
    } catch (error: any) {
      dispatch(setFeatureFlagsError(error?.message || content.toasts.flagsRefreshError));
      toast.show(error?.message || content.toasts.flagsRefreshError, { type: "danger" });
    } finally {
      dispatch(setRefreshing(false));
    }
  }, [dispatch, toast]);

  const handlePickProfilePhoto = useCallback(async () => {
    if (!user?.id) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.show(content.toasts.photoPermission, { type: "warning" });
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
        toast.show(content.toasts.photoReadError, { type: "danger" });
        return;
      }
      const mimeType = selected.mimeType || "image/jpeg";
      const imageUrl = `data:${mimeType};base64,${selected.base64}`;
      const updatedUser = await userAppService.updateProfile({ profileImageUrl: imageUrl });
      dispatch(setUser(updatedUser));
      await authStateService.updateUser(updatedUser);
      toast.show(content.toasts.photoUpdated, { type: "success" });
    } catch (error: any) {
      toast.show(error?.message || content.toasts.photoUploadError, { type: "danger" });
    } finally {
      setUploadingPhoto(false);
    }
  }, [dispatch, toast, user?.id]);

  const handleLogout = useCallback(() => {
    Alert.alert(content.logout.title, content.logout.message, [
      { text: content.logout.cancel, style: "cancel" },
      {
        text: content.logout.confirm,
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
  }, [logoutUser]);

  const toggleFlag = useCallback(
    (key: keyof FeatureFlags, value: boolean) => {
      dispatch(setLocalOverride({ key, value }));
    },
    [dispatch]
  );

  const openDevDrawer = useCallback(() => setDevDrawerVisible(true), []);
  const closeDevDrawer = useCallback(() => setDevDrawerVisible(false), []);
  const goToAddresses = useCallback(() => router.push("/(user)/addresses"), []);
  const goToVerifyPhone = useCallback(() => router.push("/(user)/verify-phone"), []);

  return {
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
  };
};
