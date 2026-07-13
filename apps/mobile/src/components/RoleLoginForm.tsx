import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@hooks/useAuth";
import { useAppSelector } from "@hooks/useRedux";
import { validateEmail } from "@utils/helpers";
import { UserRole } from "@/types";
import { colors, spacing, radius, typography, gradients, roleTheme } from "../constants/theme";

interface RoleLoginFormProps {
  role: UserRole;
  icon: string;
  title: string;
  subtitle: string;
  emailPlaceholder: string;
  successRoute: string;
  /** Extra content rendered below the form inside the scroll view */
  footer?: ReactNode;
}

export default function RoleLoginForm({
  role,
  icon,
  title,
  subtitle,
  emailPlaceholder,
  successRoute,
  footer,
}: RoleLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<{ message: string; isSuspended: boolean } | null>(null);

  const { login } = useAuth();
  const { isLoading } = useAppSelector((state) => state.auth);
  const roleStyle = roleTheme[role];
  const ctaGradient =
    role === "superAdmin"
      ? gradients.ctaBlue
      : role === "businessOwner"
      ? gradients.ctaGreen
      : role === "deliveryPartner"
      ? gradients.ctaTeal
      : gradients.ctaAmber;

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await login({ email: email.trim(), password }, role);
      router.replace(successRoute);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Please check your credentials";
      const isSuspended =
        message.toLowerCase().includes("blocked") ||
        message.toLowerCase().includes("suspended") ||
        message.toLowerCase().includes("contact the admin") ||
        message.toLowerCase().includes("contact admin");
      setLoginError({ message, isSuspended });
    }
  };

  return (
    <>
    <Modal
      visible={loginError !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setLoginError(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {loginError?.isSuspended ? (
            <>
              <View style={styles.modalIconWrapRed}>
                <Ionicons name="ban" size={36} color="#DC2626" />
              </View>
              <Text style={styles.modalTitleRed}>Account Blocked</Text>
              <Text style={styles.modalBody}>{loginError.message}</Text>
              <View style={styles.modalDivider} />
              <View style={styles.modalAdminRow}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#6B7280" />
                <Text style={styles.modalAdminHint}>Reach out to your society admin to restore access.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.modalIconWrapAmber}>
                <Ionicons name="alert-circle" size={36} color="#D97706" />
              </View>
              <Text style={styles.modalTitleAmber}>Login Failed</Text>
              <Text style={styles.modalBody}>{loginError?.message}</Text>
            </>
          )}
          <TouchableOpacity
            style={[
              styles.modalBtn,
              loginError?.isSuspended ? styles.modalBtnRed : styles.modalBtnAmber,
            ]}
            onPress={() => setLoginError(null)}
            activeOpacity={0.85}
          >
            <Text style={styles.modalBtnText}>
              {loginError?.isSuspended ? "Got it" : "Try Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <LinearGradient colors={[...gradients.authBackground]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient colors={[...roleStyle.gradient]} style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.headerIcon}>{icon}</Text>
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </LinearGradient>

            <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder={emailPlaceholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors((e) => ({ ...e, email: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                placeholderTextColor={colors.textMuted}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.passwordContainer,
                  errors.password ? styles.passwordContainerError : null,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors((e) => ({ ...e, password: undefined }));
                    }
                  }}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, isLoading ? styles.loginBtnDisabled : null]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[...ctaGradient]}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  headerIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.86)",
    textAlign: "center",
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    padding: spacing.lg,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.red[500],
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  passwordContainerError: {
    borderColor: colors.red[500],
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 12,
    color: colors.red[500],
    marginTop: 6,
    marginLeft: 4,
  },
  loginBtn: {
    borderRadius: radius.lg,
    marginTop: 10,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  loginBtnGradient: {
    paddingVertical: 17,
    alignItems: "center",
    borderRadius: radius.lg,
  },
  loginBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  loginBtnText: {
    color: colors.surface,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
    letterSpacing: 0.3,
  },
  footerSlot: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
  modalIconWrapRed: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  modalIconWrapAmber: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  modalTitleRed: {
    fontSize: 20,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 10,
    textAlign: "center",
  },
  modalTitleAmber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#D97706",
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  modalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 14,
  },
  modalAdminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 20,
  },
  modalAdminHint: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
    lineHeight: 17,
  },
  modalBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnRed: {
    backgroundColor: "#DC2626",
  },
  modalBtnAmber: {
    backgroundColor: "#D97706",
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
