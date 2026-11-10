import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppSelector } from "@hooks/useRedux";
import { useAuth } from "@hooks/useAuth";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { getBusinessStatus } from "@utils/businessStatus";
import { businessOwnerService } from "@services/businessOwnerService";
import { useAppAlert } from "@/components/ui/AppAlertProvider";
import content from "@/content/boProfile.json";

/**
 * Encapsulates all logic for the business owner profile screen: profile data,
 * Firestore real-time business sync, business settings, password change,
 * and logout.
 */
export const useBusinessOwnerProfile = () => {
  const showAlert = useAppAlert();
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
      color: verified ? "#084C3D" : "#E0A030",
      bg: verified ? "#E4F3EA" : "#FFFBEB",
      label: verified ? content.business.verified : content.business.pending,
    };
  }, [businessProfile?.isVerified]);

  const handleLogout = useCallback(() => {
    showAlert({
      title: content.logout.title,
      message: content.logout.confirm,
      variant: "destructive",
      buttons: [
        { text: content.logout.cancel, style: "cancel" },
        {
          text: content.logout.action,
          style: "destructive",
          onPress: async () => {
            await logoutUser();
            router.replace("/(auth)/business-owner-login");
          },
        },
      ],
    });
  }, [logoutUser, showAlert]);

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
      showAlert({ title: content.alerts.savedTitle, message: content.alerts.savedMsg, variant: "success" });
    } catch (err: any) {
      showAlert({
        title: content.alerts.errorTitle,
        message: err?.response?.data?.error || err?.message || content.alerts.settingsErrorFallback,
        variant: "error",
      });
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
    showAlert,
  ]);

  const handleUpdateShopImage = useCallback(
    async (imageUrl: string | null) => {
      if (!imageUrl) return;
      setIsUploadingShopImage(true);
      try {
        await businessOwnerService.updateBusinessImage({ imageUrl });
        await loadBusinessProfile().catch(() => null);
      } catch (err: any) {
        showAlert({
          title: content.alerts.errorTitle,
          message: err?.response?.data?.error || err?.message || "Failed to update shop image",
          variant: "error",
        });
      } finally {
        setIsUploadingShopImage(false);
      }
    },
    [loadBusinessProfile, showAlert]
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
      showAlert({
        title: content.password.successTitle,
        message: content.password.successMsg,
        variant: "success",
        buttons: [
          {
            text: content.alerts.ok,
            onPress: () => {
              setShowChangePassword(false);
              setNewPassword("");
              setConfirmPassword("");
            },
          },
        ],
      });
    } catch (err: any) {
      showAlert({
        title: content.alerts.errorTitle,
        message: err?.response?.data?.error || err?.message || content.alerts.passwordErrorFallback,
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [changePassword, confirmPassword, newPassword, showAlert]);

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
