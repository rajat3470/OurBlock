import { useCallback, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { phoneVerificationService } from "@services/phoneVerificationService";
import { authStateService } from "@services/authStateService";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { setUser } from "@store/slices/authSlice";
import content from "@/content/verifyPhone.json";

export type VerifyPhoneStep = "phone" | "code";

/**
 * Encapsulates the phone verification flow: sending/verifying OTP codes,
 * resend, and post-verification user state updates + navigation.
 */
export const usePhoneVerification = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const params = useLocalSearchParams<{ fromRegistration?: string }>();
  const user = useAppSelector((state) => state.auth.user);

  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<VerifyPhoneStep>("phone");
  const [loading, setLoading] = useState(false);
  const cameFromRegistration = params.fromRegistration === "1";

  const handleSkip = useCallback(() => {
    router.replace("/(user)/home");
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/profile");
    }
  }, []);

  const goToPhoneStep = useCallback(() => setStep("phone"), []);

  const handleSendCode = useCallback(async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast.show(content.toasts.invalidPhone, { type: "danger" });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phoneVerificationService.formatPhoneNumber(phoneNumber);
      const confirmationResult =
        await phoneVerificationService.sendVerificationCode(formattedPhone);
      setConfirmation(confirmationResult);
      setStep("code");
      toast.show(content.toasts.codeSent, { type: "success" });
    } catch (error: any) {
      toast.show(error.message || content.toasts.sendFailed, { type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, toast]);

  const handleVerifyCode = useCallback(async () => {
    if (!phoneVerificationService.validateOTP(code)) {
      toast.show(content.toasts.invalidCode, { type: "danger" });
      return;
    }

    setLoading(true);
    try {
      await phoneVerificationService.verifyCode(confirmation!, code);
      if (user) {
        const updatedUser = { ...user, isPhoneVerified: true, phone: phoneNumber };
        dispatch(setUser(updatedUser));
        await authStateService.updateUser(updatedUser);
      }
      toast.show(content.toasts.verified, { type: "success" });
      router.replace("/(user)/home");
    } catch (error: any) {
      toast.show(error.message || content.toasts.verifyFailed, { type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [code, confirmation, dispatch, phoneNumber, toast, user]);

  const handleResendCode = useCallback(async () => {
    setCode("");
    setConfirmation(null);
    setStep("phone");
    await handleSendCode();
  }, [handleSendCode]);

  return {
    phoneNumber,
    setPhoneNumber,
    code,
    setCode,
    step,
    loading,
    cameFromRegistration,
    handleSkip,
    goBack,
    goToPhoneStep,
    handleSendCode,
    handleVerifyCode,
    handleResendCode,
  };
};
