import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { useAuth } from "@hooks/useAuth";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { getBusinessStatus } from "@utils/businessStatus";
import { subscribeToBusiness } from "@services/businessSyncService";
import { businessOwnerService } from "@services/businessOwnerService";
import { setBusinessProfile } from "@store/slices/businessOwnerSlice";
import content from "@/content/boProfile.json";

/**
 * Encapsulates all logic for the business owner profile screen: profile data,
 * Firestore real-time business sync, business settings, password change,
 * and logout.
 */
export const useBusinessOwnerProfile = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { logoutUser, changePassword } = useAuth();
  const { businessProfile, loadBusinessProfile } = useBusinessOwner();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsMinOrder, setSettingsMinOrder] = useState("");
  const [settingsDeliveryTime, setSettingsDeliveryTime] = useState("");
  const [settingsPrepTime, setSettingsPrepTime] = useState("");
  const [settingsDeliveryFee, setSettingsDeliveryFee] = useState("");
  const [settingsTags, setSettingsTags] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingShopImage, setIsUploadingShopImage] = useState(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadBusinessProfile().catch(() => null);
  }, [loadBusinessProfile]);

  useEffect(() => {
    if (!businessProfile?.id) return;
    return subscribeToBusiness(businessProfile.id, (updated) => {
      dispatch(setBusinessProfile(updated));
    });
  }, [businessProfile?.id, dispatch]);

  useEffect(() => {
    if (businessProfile) {
      setSettingsMinOrder(String(businessProfile.minimumOrderAmount ?? ""));
      setSettingsDeliveryTime(businessProfile.estimatedDeliveryTime ?? "");
      setSettingsPrepTime(businessProfile.preparationTime ?? "");
      setSettingsDeliveryFee(String(businessProfile.deliveryFee ?? ""));
      setSettingsTags(Array.isArray(businessProfile.tags) ? businessProfile.tags.join(", ") : "");
    }
  }, [businessProfile]);

  const businessStatus = useMemo(
    () => (businessProfile ? getBusinessStatus(businessProfile) : null),
    [businessProfile]
  );

  const verificationMeta = useMemo(() => {
    const verified = !!businessProfile?.isVerified;
    return {
      color: verified ? "#16A34A" : "#D97706",
      bg: verified ? "#DCFCE7" : "#FFFBEB",
      label: verified ? content.business.verified : content.business.pending,
    };
  }, [businessProfile?.isVerified]);

  const handleLogout = useCallback(() => {
    Alert.alert(content.logout.title, content.logout.confirm, [
      { text: content.logout.cancel, style: "cancel" },
      {
        text: content.logout.action,
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/(auth)/business-owner-login");
        },
      },
    ]);
  }, [logoutUser]);

  const handleSaveSettings = useCallback(async () => {
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
      Alert.alert(content.alerts.savedTitle, content.alerts.savedMsg);
    } catch (err: any) {
      Alert.alert(
        content.alerts.errorTitle,
        err?.response?.data?.error || err?.message || content.alerts.settingsErrorFallback
      );
    } finally {
      setIsSavingSettings(false);
    }
  }, [
    settingsMinOrder,
    settingsDeliveryTime,
    settingsPrepTime,
    settingsDeliveryFee,
    settingsTags,
    loadBusinessProfile,
  ]);

  const handleUpdateShopImage = useCallback(
    async (imageUrl: string | null) => {
      if (!imageUrl) return;
      setIsUploadingShopImage(true);
      try {
        await businessOwnerService.updateBusinessImage({ imageUrl });
        await loadBusinessProfile().catch(() => null);
      } catch (err: any) {
        Alert.alert(
          content.alerts.errorTitle,
          err?.response?.data?.error || err?.message || "Failed to update shop image"
        );
      } finally {
        setIsUploadingShopImage(false);
      }
    },
    [loadBusinessProfile]
  );

  const handleChangePassword = useCallback(async () => {
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError(content.password.errors.minLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(content.password.errors.mismatch);
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(newPassword);
      Alert.alert(content.password.successTitle, content.password.successMsg, [
        {
          text: content.alerts.ok,
          onPress: () => {
            setShowChangePassword(false);
            setNewPassword("");
            setConfirmPassword("");
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        content.alerts.errorTitle,
        err?.response?.data?.error || err?.message || content.alerts.passwordErrorFallback
      );
    } finally {
      setIsSaving(false);
    }
  }, [changePassword, confirmPassword, newPassword]);

  return {
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
  };
};
