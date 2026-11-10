import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { brand, colors, fonts, radius } from "@/constants/theme";

export interface CardDetails {
  holderName: string;
  number: string;
  expiryMM: string;
  expiryYY: string;
  cvv: string;
}

interface Props {
  visible: boolean;
  initialValues?: CardDetails;
  onConfirm: (card: CardDetails) => void;
  onCancel: () => void;
}

const EMPTY_CARD: CardDetails = { holderName: "", number: "", expiryMM: "", expiryYY: "", cvv: "" };

function detectCardBrand(num: string): { icon: string; color: string; label: string } | null {
  const d = num.replace(/\s/g, "");
  if (/^4/.test(d)) return { icon: "card", color: "#1A1F71", label: "VISA" };
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return { icon: "card", color: "#EB001B", label: "MC" };
  if (/^3[47]/.test(d)) return { icon: "card", color: "#006FCF", label: "AMEX" };
  if (/^6(?:011|5)/.test(d)) return { icon: "card", color: "#FF6600", label: "DISC" };
  if (/^35(?:2[89]|[3-8])/.test(d)) return { icon: "card", color: "#0B7CBE", label: "JCB" };
  if (/^(?:60|65|81|82)/.test(d)) return { icon: "card", color: "#084C3D", label: "RuPay" };
  return null;
}

export function CardDetailsModal({ visible, initialValues, onConfirm, onCancel }: Props) {
  const [card, setCard] = useState<CardDetails>(initialValues ?? EMPTY_CARD);
  const [errors, setErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});
  const [showCvv, setShowCvv] = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const numberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setCard(initialValues ?? EMPTY_CARD);
      setErrors({});
      setShowCvv(false);
      slideAnim.setValue(300);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, initialValues, slideAnim, backdropAnim]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onCancel());
  }, [slideAnim, backdropAnim, onCancel]);

  const validate = useCallback((): boolean => {
    const e: Partial<Record<keyof CardDetails, string>> = {};
    if (card.holderName.trim().length < 2) e.holderName = "Enter cardholder name";
    const cn = card.number.replace(/\s/g, "");
    if (cn.length < 13 || cn.length > 19) e.number = "Enter a valid card number";
    const mm = parseInt(card.expiryMM, 10);
    if (!card.expiryMM || card.expiryMM.length !== 2 || mm < 1 || mm > 12) e.expiryMM = "Invalid expiry";
    if (!card.expiryYY || card.expiryYY.length !== 2) e.expiryYY = "Invalid year";
    if (card.cvv.length < 3 || card.cvv.length > 4) e.cvv = "Invalid CVV";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [card]);

  const handleConfirm = useCallback(() => {
    if (!validate()) return;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onConfirm(card));
  }, [validate, card, onConfirm, slideAnim, backdropAnim]);

  const formatCardNumber = (t: string) => {
    const digits = t.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (t: string) => {
    const digits = t.replace(/\D/g, "").slice(0, 4);
    setCard((p) => ({ ...p, expiryMM: digits.slice(0, 2), expiryYY: digits.slice(2, 4) }));
  };

  const expiryDisplay = card.expiryMM
    ? card.expiryYY
      ? `${card.expiryMM}/${card.expiryYY}`
      : card.expiryMM.length === 2
      ? `${card.expiryMM}/`
      : card.expiryMM
    : "";

  const cardBrand = detectCardBrand(card.number);
  const isValid = card.holderName.trim().length >= 2
    && card.number.replace(/\s/g, "").length >= 13
    && card.expiryMM.length === 2
    && card.expiryYY.length === 2
    && card.cvv.length >= 3;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.keyboardView}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
                {/* Handle */}
                <View style={s.handleBar} />

                {/* Header */}
                <View style={s.header}>
                  <View style={s.headerLeft}>
                    <View style={s.cardIconWrap}>
                      <Ionicons name="card" size={22} color={brand.primary} />
                    </View>
                    <Text style={s.headerTitle}>Card Details</Text>
                  </View>
                  <TouchableOpacity onPress={dismiss} style={s.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Card Preview */}
                <LinearGradient
                  colors={[brand.primaryDark, brand.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.cardPreview}
                >
                  <View style={s.cardPreviewTop}>
                    <Ionicons name="wifi" size={18} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: "90deg" }] }} />
                    {cardBrand && (
                      <View style={s.brandBadge}>
                        <Text style={s.brandText}>{cardBrand.label}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardPreviewNumber}>
                    {card.number || "•••• •••• •••• ••••"}
                  </Text>
                  <View style={s.cardPreviewBottom}>
                    <View>
                      <Text style={s.cardPreviewLabel}>CARDHOLDER</Text>
                      <Text style={s.cardPreviewValue}>
                        {card.holderName.toUpperCase() || "YOUR NAME"}
                      </Text>
                    </View>
                    <View style={s.cardPreviewExpiry}>
                      <Text style={s.cardPreviewLabel}>EXPIRES</Text>
                      <Text style={s.cardPreviewValue}>
                        {card.expiryMM && card.expiryYY ? `${card.expiryMM}/${card.expiryYY}` : "MM/YY"}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* Form */}
                <View style={s.form}>
                  {/* Cardholder Name */}
                  <View style={s.field}>
                    <Text style={s.label}>Cardholder Name</Text>
                    <View style={[s.inputWrap, errors.holderName && s.inputError]}>
                      <Ionicons name="person-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
                      <TextInput
                        style={s.input}
                        placeholder="John Doe"
                        placeholderTextColor={colors.textMuted}
                        value={card.holderName}
                        onChangeText={(t) => { setCard((p) => ({ ...p, holderName: t })); setErrors((e) => ({ ...e, holderName: undefined })); }}
                        autoCapitalize="words"
                        returnKeyType="next"
                        onSubmitEditing={() => numberRef.current?.focus()}
                      />
                    </View>
                    {errors.holderName && <Text style={s.errorText}>{errors.holderName}</Text>}
                  </View>

                  {/* Card Number */}
                  <View style={s.field}>
                    <Text style={s.label}>Card Number</Text>
                    <View style={[s.inputWrap, errors.number && s.inputError]}>
                      <Ionicons name="card-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
                      <TextInput
                        ref={numberRef}
                        style={s.input}
                        placeholder="1234 5678 9012 3456"
                        placeholderTextColor={colors.textMuted}
                        value={card.number}
                        onChangeText={(t) => { setCard((p) => ({ ...p, number: formatCardNumber(t) })); setErrors((e) => ({ ...e, number: undefined })); }}
                        keyboardType="number-pad"
                        maxLength={19}
                        returnKeyType="next"
                        onSubmitEditing={() => expiryRef.current?.focus()}
                      />
                      {cardBrand && (
                        <View style={[s.brandInline, { backgroundColor: cardBrand.color + "18" }]}>
                          <Text style={[s.brandInlineText, { color: cardBrand.color }]}>{cardBrand.label}</Text>
                        </View>
                      )}
                    </View>
                    {errors.number && <Text style={s.errorText}>{errors.number}</Text>}
                  </View>

                  {/* Expiry + CVV row */}
                  <View style={s.row}>
                    <View style={[s.field, { flex: 1 }]}>
                      <Text style={s.label}>Expiry</Text>
                      <View style={[s.inputWrap, (errors.expiryMM || errors.expiryYY) && s.inputError]}>
                        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
                        <TextInput
                          ref={expiryRef}
                          style={s.input}
                          placeholder="MM/YY"
                          placeholderTextColor={colors.textMuted}
                          value={expiryDisplay}
                          onChangeText={(t) => { formatExpiry(t); setErrors((e) => ({ ...e, expiryMM: undefined, expiryYY: undefined })); }}
                          keyboardType="number-pad"
                          maxLength={5}
                          returnKeyType="next"
                          onSubmitEditing={() => cvvRef.current?.focus()}
                        />
                      </View>
                      {(errors.expiryMM || errors.expiryYY) && <Text style={s.errorText}>{errors.expiryMM || errors.expiryYY}</Text>}
                    </View>

                    <View style={[s.field, { flex: 1 }]}>
                      <Text style={s.label}>CVV</Text>
                      <View style={[s.inputWrap, errors.cvv && s.inputError]}>
                        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
                        <TextInput
                          ref={cvvRef}
                          style={s.input}
                          placeholder="•••"
                          placeholderTextColor={colors.textMuted}
                          value={card.cvv}
                          onChangeText={(t) => { setCard((p) => ({ ...p, cvv: t.replace(/\D/g, "").slice(0, 4) })); setErrors((e) => ({ ...e, cvv: undefined })); }}
                          keyboardType="number-pad"
                          maxLength={4}
                          secureTextEntry={!showCvv}
                          returnKeyType="done"
                          onSubmitEditing={handleConfirm}
                        />
                        <TouchableOpacity onPress={() => setShowCvv((v) => !v)} hitSlop={8}>
                          <Ionicons name={showCvv ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      {errors.cvv && <Text style={s.errorText}>{errors.cvv}</Text>}
                    </View>
                  </View>
                </View>

                {/* Secure badge */}
                <View style={s.secureBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={s.secureText}>Your card details are encrypted and secure</Text>
                </View>

                {/* Confirm button */}
                <TouchableOpacity
                  style={[s.confirmBtn, !isValid && s.confirmBtnDisabled]}
                  disabled={!isValid}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={s.confirmBtnText}>Save Card Details</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,46,34,0.45)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "92%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: brand.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardPreview: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    minHeight: 160,
    justifyContent: "space-between",
  },
  cardPreviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  brandText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  cardPreviewNumber: {
    fontSize: 20,
    fontFamily: fonts.ui,
    color: "#FFFFFF",
    letterSpacing: 2.5,
    marginVertical: 16,
  },
  cardPreviewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardPreviewLabel: {
    fontSize: 9,
    fontFamily: fonts.ui,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardPreviewValue: {
    fontSize: 13,
    fontFamily: fonts.uiMedium,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  cardPreviewExpiry: {
    alignItems: "flex-end",
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: colors.textPrimary,
    height: 48,
  },
  brandInline: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  brandInlineText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  errorText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#DC2626",
    marginLeft: 2,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
    marginBottom: 16,
  },
  secureText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#059669",
  },
  confirmBtn: {
    flexDirection: "row",
    backgroundColor: brand.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
