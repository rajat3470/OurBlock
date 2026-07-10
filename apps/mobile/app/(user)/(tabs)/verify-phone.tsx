import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { usePhoneVerification } from "@hooks/usePhoneVerification";
import content from "@/content/verifyPhone.json";

export default function PhoneVerificationScreen() {
  const insets = useSafeAreaInsets();
  const {
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
  } = usePhoneVerification();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0E9F6E", "#0891B2"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.headerTitle}</Text>
        {cameFromRegistration ? (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>{content.skip}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </LinearGradient>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📱</Text>
          </View>

          {step === "phone" ? (
            <>
              <Text style={styles.title}>{content.phoneStep.title}</Text>
              <Text style={styles.subtitle}>{content.phoneStep.subtitle}</Text>

              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>{content.phoneStep.notice}</Text>
              </View>

              <View style={styles.phoneContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>{content.countryCode}</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder={content.phoneStep.placeholder}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor="#9CA3AF"
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
                  <Text style={styles.sendBtnText}>{content.phoneStep.sendBtn}</Text>
                )}
              </TouchableOpacity>

              {cameFromRegistration ? (
                <TouchableOpacity style={styles.skipSecondaryBtn} onPress={handleSkip}>
                  <Text style={styles.skipSecondaryText}>{content.phoneStep.skipSecondary}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.title}>{content.codeStep.title}</Text>
              <Text style={styles.subtitle}>
                {content.codeStep.subtitlePrefix} {phoneNumber}
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder={content.codeStep.placeholder}
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
                  <Text style={styles.verifyBtnText}>{content.codeStep.verifyBtn}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>{content.codeStep.resendPrompt}</Text>
                <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                  <Text style={styles.resendLink}>{content.codeStep.resendLink}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.changeNumberBtn} onPress={goToPhoneStep}>
                <Text style={styles.changeNumberText}>{content.codeStep.changeNumber}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  skipBtn: {
    minWidth: 48,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
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
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
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
    color: "#111827",
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
    color: "#111827",
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
    color: "#111827",
    marginBottom: 24,
  },
  sendBtn: {
    width: "100%",
    backgroundColor: "#F59E0B",
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
    color: "#6B7280",
  },
  verifyBtn: {
    width: "100%",
    backgroundColor: "#F59E0B",
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
    color: "#6B7280",
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0E9F6E",
  },
  changeNumberBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  changeNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});
