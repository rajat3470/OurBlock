import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useToast } from "react-native-toast-notifications";
import { phoneVerificationService } from "../../src/services/phoneVerificationService";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { colors } from "../../src/constants/theme";
import app from "../../src/services/firebase";
import { setUser } from "../../src/store/slices/authSlice";
import { authStateService } from "../../src/services/authStateService";

export default function PhoneVerificationScreen() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const params = useLocalSearchParams<{ fromRegistration?: string }>();
  const user = useAppSelector((state) => state.auth.user);
  const recaptchaVerifier = useRef<any>(null);

  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const cameFromRegistration = params.fromRegistration === "1";

  const handleSkip = () => {
    router.replace("/(user)/home");
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast.show("Please enter a valid 10-digit phone number", { type: "danger" });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phoneVerificationService.formatPhoneNumber(phoneNumber);
      const verId = await phoneVerificationService.sendVerificationCode(
        formattedPhone,
        recaptchaVerifier.current
      );
      setVerificationId(verId);
      setStep("code");
      toast.show("Verification code sent to your phone", { type: "success" });
    } catch (error: any) {
      toast.show(error.message || "Failed to send verification code", { type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phoneVerificationService.validateOTP(code)) {
      toast.show("Please enter a valid 6-digit code", { type: "danger" });
      return;
    }

    setLoading(true);
    try {
      await phoneVerificationService.verifyCode(verificationId, code);
      if (user) {
        const updatedUser = { ...user, isPhoneVerified: true, phone: phoneNumber };
        dispatch(setUser(updatedUser));
        await authStateService.updateUser(updatedUser);
      }
      toast.show("Phone number verified successfully", { type: "success" });
      router.replace("/(user)/home");
    } catch (error: any) {
      toast.show(error.message || "Invalid verification code", { type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode("");
    setStep("phone");
    await handleSendCode();
  };

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Phone Number</Text>
          {cameFromRegistration ? (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📱</Text>
          </View>

          {step === "phone" ? (
            <>
              <Text style={styles.title}>Enter your phone number</Text>
              <Text style={styles.subtitle}>
                We'll send you a 6-digit verification code
              </Text>

              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>
                  You can skip for now, but phone verification is mandatory when trying to order something.
                </Text>
              </View>

              <View style={styles.phoneContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit mobile number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendBtnText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              {cameFromRegistration ? (
                <TouchableOpacity style={styles.skipSecondaryBtn} onPress={handleSkip}>
                  <Text style={styles.skipSecondaryText}>Skip for now</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter verification code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to +91 {phoneNumber}
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                  <Text style={styles.resendLink}>Resend</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.changeNumberBtn}
                onPress={() => setStep("phone")}
              >
                <Text style={styles.changeNumberText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  skipBtn: {
    minWidth: 48,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.blue[500],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  noticeCard: {
    width: "100%",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#9A3412",
    textAlign: "center",
    fontWeight: "500",
  },
  phoneContainer: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 24,
  },
  countryCode: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderLeftWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  codeInput: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
    color: colors.textPrimary,
    marginBottom: 24,
  },
  sendBtn: {
    width: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  skipSecondaryBtn: {
    marginTop: 14,
    paddingVertical: 10,
  },
  skipSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  verifyBtn: {
    width: "100%",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3B82F6",
  },
  changeNumberBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  changeNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
