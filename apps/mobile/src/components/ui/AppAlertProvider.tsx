import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, brand, colors, radius } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertVariant = "info" | "success" | "warning" | "error" | "confirm" | "destructive";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
}

export interface AlertOptions {
  title: string;
  message: string;
  variant?: AlertVariant;
  buttons?: AlertButton[];
}

type ShowAlertFn = (options: AlertOptions) => void;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AlertContext = createContext<ShowAlertFn>(() => {});

export const useAppAlert = () => useContext(AlertContext);

// ---------------------------------------------------------------------------
// Icon per variant
// ---------------------------------------------------------------------------

const VARIANT_CONFIG: Record<AlertVariant, {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}> = {
  info: { icon: "information-circle", iconColor: brand.primary, iconBg: brand.soft },
  success: { icon: "checkmark-circle", iconColor: "#059669", iconBg: "#ECFDF5" },
  warning: { icon: "warning", iconColor: "#D97706", iconBg: "#FFFBEB" },
  error: { icon: "close-circle", iconColor: "#DC2626", iconBg: "#FEF2F2" },
  confirm: { icon: "help-circle", iconColor: brand.primary, iconBg: brand.soft },
  destructive: { icon: "alert-circle", iconColor: "#DC2626", iconBg: "#FEF2F2" },
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertOptions | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showAlert: ShowAlertFn = useCallback((options) => {
    setConfig(options);
    setVisible(true);
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
    });
  }, [scaleAnim, opacityAnim]);

  const handlePress = useCallback((button: AlertButton) => {
    dismiss();
    button.onPress?.();
  }, [dismiss]);

  const variant = config?.variant ?? "info";
  const vc = VARIANT_CONFIG[variant];
  const buttons = config?.buttons;

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
        <Animated.View style={[s.backdrop, { opacity: opacityAnim }]}>
          <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
            {/* Icon */}
            <View style={[s.iconWrap, { backgroundColor: vc.iconBg }]}>
              <Ionicons name={vc.icon} size={28} color={vc.iconColor} />
            </View>

            {/* Title */}
            <Text style={s.title}>{config?.title}</Text>

            {/* Message */}
            <Text style={s.message}>{config?.message}</Text>

            {/* Buttons */}
            <View style={s.buttonRow}>
              {buttons && buttons.length > 0 ? (
                buttons.map((btn, i) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        s.btn,
                        isCancel && s.btnCancel,
                        isDestructive && s.btnDestructive,
                        !isCancel && !isDestructive && s.btnPrimary,
                        buttons.length === 1 && s.btnFull,
                      ]}
                      onPress={() => handlePress(btn)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          s.btnText,
                          isCancel && s.btnTextCancel,
                          !isCancel && s.btnTextPrimary,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <TouchableOpacity
                  style={[s.btn, s.btnPrimary, s.btnFull]}
                  onPress={dismiss}
                  activeOpacity={0.75}
                >
                  <Text style={[s.btnText, s.btnTextPrimary]}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,46,34,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#0B2E22",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnFull: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: brand.primary,
  },
  btnCancel: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDestructive: {
    backgroundColor: "#DC2626",
  },
  btnText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    fontWeight: "700",
  },
  btnTextPrimary: {
    color: "#FFFFFF",
  },
  btnTextCancel: {
    color: colors.textPrimary,
  },
});
