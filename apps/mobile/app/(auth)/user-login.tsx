import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { phoneVerificationService } from "../../src/services/phoneVerificationService";
import { authService } from "../../src/services/authService";
import { useAuth } from "../../src/hooks/useAuth";
import { useAppSelector } from "../../src/hooks/useRedux";
import { colors, fonts, brand } from "../../src/constants/theme";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";

type Step = "phone" | "otp";

export default function UserOTPLoginScreen() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const { otpLogin } = useAuth();
  const { isLoading } = useAppSelector((s) => s.auth);
  const toast = useToast();

  const handleSendOTP = useCallback(async () => {
    setPhoneError("");
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const formatted = phoneVerificationService.formatPhoneNumber(phone);
      await authService.sendLoginOTP(formatted);
      setStep("otp");
      toast.show("OTP sent successfully", { type: "success" });
    } catch (error: any) {
      toast.show(error.message || "Failed to send OTP", { type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [phone, toast]);

  const handleVerifyOTP = useCallback(async () => {
    if (!phoneVerificationService.validateOTP(code)) {
      toast.show("Please enter a valid 6-digit code", { type: "danger" });
      return;
    }

    setLoading(true);
    try {
      const formatted = phoneVerificationService.formatPhoneNumber(phone);
      const response = await otpLogin(formatted, code);

      if (response?.user?.societyId) {
        router.replace("/(user)/home");
      } else {
        router.replace("/(auth)/user-society-select");
      }
    } catch (error: any) {
      toast.show(error.message || "Verification failed", { type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [code, phone, otpLogin, toast]);

  const handleResend = useCallback(async () => {
    setCode("");
    setLoading(true);
    try {
      const formatted = phoneVerificationService.formatPhoneNumber(phone);
      await authService.sendLoginOTP(formatted);
      toast.show("OTP resent", { type: "success" });
    } catch (error: any) {
      toast.show(error.message || "Failed to resend OTP", { type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [phone, toast]);

  const handleChangeNumber = useCallback(() => {
    setStep("phone");
    setCode("");
  }, []);

  const busy = loading || isLoading;

  return (
    <MmScreen showBack>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Resident</Text>
            </View>
            <Text style={styles.title}>
              {step === "phone" ? "Enter your\nmobile number" : "Verify OTP"}
            </Text>
            <Text style={styles.subtitle}>
              {step === "phone"
                ? "We'll send you a one-time password to verify your number."
                : `Enter the 6-digit code sent to +91 ${phone}`}
            </Text>
          </View>

          {step === "phone" ? (
            <View style={styles.form}>
              <MmInput
                label="MOBILE NUMBER"
                placeholder="98765 43210"
                prefix="+91"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v.replace(/\D/g, "").slice(0, 10));
                  if (phoneError) setPhoneError("");
                }}
                keyboardType="phone-pad"
                autoFocus
                editable={!busy}
                error={phoneError}
              />
              <MmButton
                label="Send OTP"
                onPress={handleSendOTP}
                loading={busy}
                disabled={busy}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.otpField}>
                <Text style={styles.otpLabel}>ENTER OTP</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="------"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!busy}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <MmButton
                label="Verify & Continue"
                onPress={handleVerifyOTP}
                loading={busy}
                disabled={busy}
              />

              <View style={styles.otpActions}>
                <TouchableOpacity onPress={handleResend} disabled={busy}>
                  <Text style={styles.linkText}>Resend OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangeNumber} disabled={busy}>
                  <Text style={styles.linkText}>Change number</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
    gap: 40,
  },
  header: {
    gap: 16,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(11,46,34,0.06)",
    borderWidth: 1,
    borderColor: "rgba(11,46,34,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.forest[700],
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.textSecondary,
    maxWidth: 289,
  },
  form: {
    gap: 16,
  },
  otpField: {
    gap: 7,
  },
  otpLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },
  otpInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 24,
    fontFamily: fonts.semiBold,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.textPrimary,
  },
  otpActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  linkText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: brand.accentDark,
  },
});

/* ── Old email/password login (commented out — to be replaced by OTP flow) ──
import RoleLoginForm from "../../src/components/RoleLoginForm";

export default function UserLoginScreen() {
  return (
    <RoleLoginForm
      role="user"
      badge="Resident"
      title={"Welcome back"}
      subtitle="Sign in to explore shops in your mohalla and get them delivered."
      emailPlaceholder="you@example.com"
      successRoute="/(user)/home"
      registerRoute="/(auth)/user-register"
      registerLabel="New here? Create an account"
    />
  );
}
── end old login ── */
