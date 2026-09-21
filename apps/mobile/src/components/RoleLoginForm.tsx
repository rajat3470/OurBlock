import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@hooks/useAuth";
import { useAppSelector } from "@hooks/useRedux";
import { validateEmail } from "@utils/helpers";
import { UserRole } from "@/types";
import { colors, fonts } from "../constants/theme";
import MmScreen from "./ui/MmScreen";
import MmInput from "./ui/MmInput";
import MmButton from "./ui/MmButton";

interface RoleLoginFormProps {
  role: UserRole;
  badge: string;
  title: string;
  subtitle: string;
  emailPlaceholder: string;
  successRoute: string;
  registerRoute?: string;
  registerLabel?: string;
  footer?: ReactNode;
}

export default function RoleLoginForm({
  role,
  badge,
  title,
  subtitle,
  emailPlaceholder,
  successRoute,
  registerRoute,
  registerLabel,
  footer,
}: RoleLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<{ message: string; isSuspended: boolean } | null>(null);

  const { login } = useAuth();
  const { isLoading } = useAppSelector((state) => state.auth);

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
            </>
          ) : (
            <>
              <View style={styles.modalIconWrapAmber}>
                <Ionicons name="alert-circle" size={36} color="#E0A030" />
              </View>
              <Text style={styles.modalTitleAmber}>Login Failed</Text>
              <Text style={styles.modalBody}>{loginError?.message}</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.modalBtn}
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
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>
            <MmInput
              label="EMAIL"
              placeholder={emailPlaceholder}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              error={errors.email}
            />
            <MmInput
              label="PASSWORD"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              error={errors.password}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.showPass}>
              <Text style={styles.showPassText}>{showPassword ? "Hide password" : "Show password"}</Text>
            </TouchableOpacity>

            <MmButton label="Sign In" onPress={handleLogin} loading={isLoading} />
          </View>

          {registerRoute ? (
            <TouchableOpacity
              onPress={() => router.push(registerRoute as never)}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>{registerLabel}</Text>
            </TouchableOpacity>
          ) : null}

          {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </MmScreen>
    </>
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
  showPass: {
    marginTop: -8,
  },
  showPassText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  registerLink: {
    marginTop: -24,
  },
  registerText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: -0.24,
    color: colors.textSecondary,
  },
  footerSlot: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11,46,34,0.55)",
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
  },
  modalIconWrapRed: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconWrapAmber: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F8EEE0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitleRed: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: "#DC2626",
    marginBottom: 10,
    textAlign: "center",
  },
  modalTitleAmber: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: "#E0A030",
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  modalBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6B853",
  },
  modalBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
});
