import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { Ionicons } from "@expo/vector-icons";
import { phoneVerificationService } from "../../src/services/phoneVerificationService";
import { authService } from "../../src/services/authService";
import { societyService } from "../../src/services/societyService";
import { useAuth } from "../../src/hooks/useAuth";
import { useAppSelector } from "../../src/hooks/useRedux";
import { Society } from "../../src/types/index";
import { colors, fonts, brand } from "../../src/constants/theme";
import { SocietyPickerModal } from "../../src/components/auth/SocietyPickerModal";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";
import MmChip from "../../src/components/ui/MmChip";
import MmProgress from "../../src/components/ui/MmProgress";
import content from "../../src/content/boRegister.json";

const BUSINESS_CATEGORIES = [
  { label: "Kirana Store", value: "grocery" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Fast Food", value: "fast_food" },
  { label: "Bakery / Cafe", value: "cafe" },
  { label: "Dairy", value: "dairy" },
  { label: "Fruits & Vegetables", value: "fruits_vegetables" },
  { label: "Electronics", value: "electronics" },
  { label: "Hardware", value: "hardware" },
  { label: "Gym", value: "gym" },
  { label: "Salon", value: "salon" },
  { label: "Other", value: "other" },
];

type Step = "phone" | "otp" | "details";

export default function BusinessOwnerRegisterScreen() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [shopName, setShopName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [selectedSocietyName, setSelectedSocietyName] = useState("");
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);
  const [societySearch, setSocietySearch] = useState("");
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { registerBusinessOwnerOTP } = useAuth();
  const { isLoading } = useAppSelector((s) => s.auth);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      setLoadingSocieties(true);
      try {
        const res = await societyService.getSocieties(1, 100);
        setSocieties(res.data);
      } catch {
      } finally {
        setLoadingSocieties(false);
      }
    })();
  }, []);

  const filteredSocieties = societies.filter(
    (s) =>
      s.name.toLowerCase().includes(societySearch.toLowerCase()) ||
      s.city.toLowerCase().includes(societySearch.toLowerCase())
  );

  const handleSendOTP = useCallback(async () => {
    setPhoneError("");
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError(content.errors.phoneInvalid);
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
      toast.show(content.errors.otpInvalid, { type: "danger" });
      return;
    }
    setStep("details");
  }, [code, toast]);

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

  const validateDetails = (): boolean => {
    const e: Record<string, string> = {};
    if (!shopName.trim()) e.shopName = content.errors.shopNameRequired;
    if (!selectedCategory) e.category = content.errors.categoryRequired;
    if (!selectedSocietyId) e.society = content.errors.societyRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateDetails()) return;

    setLoading(true);
    try {
      const formatted = phoneVerificationService.formatPhoneNumber(phone);
      await registerBusinessOwnerOTP(
        formatted,
        code,
        selectedSocietyId,
        shopName.trim(),
        selectedCategory
      );
      router.replace("/(business-owner)/application-received");
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        error.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [phone, code, selectedSocietyId, shopName, selectedCategory, registerBusinessOwnerOTP]);

  const handleBack = useCallback(() => {
    if (step === "details") {
      setStep("otp");
      return;
    }
    if (step === "otp") {
      setStep("phone");
      setCode("");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/business-owner-login");
  }, [step]);

  const busy = loading || isLoading;

  const stepIndex = step === "phone" ? 0 : step === "otp" ? 1 : 2;
  const headerTitle =
    step === "phone"
      ? content.header.phoneTitle
      : step === "otp"
      ? content.header.otpTitle
      : content.header.detailsTitle;
  const headerSubtitle =
    step === "phone"
      ? content.header.phoneSubtitle
      : step === "otp"
      ? content.header.otpSubtitle.replace("{phone}", phone)
      : content.header.detailsSubtitle;

  return (
    <MmScreen showBack onBack={handleBack}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MmProgress active={stepIndex + 1} total={3} />

          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Business Partner</Text>
            </View>
            <Text style={styles.title}>{headerTitle}</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
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
                label={content.buttons.sendOtp}
                onPress={handleSendOTP}
                loading={busy}
                disabled={busy}
              />

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.replace("/(auth)/business-owner-login")}
              >
                <Text style={styles.loginLinkText}>
                  Already registered? Login here
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {step === "otp" ? (
            <View style={styles.form}>
              <View style={styles.otpField}>
                <Text style={styles.otpLabel}>ENTER OTP</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="------"
                  value={code}
                  onChangeText={(v) =>
                    setCode(v.replace(/\D/g, "").slice(0, 6))
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!busy}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <MmButton
                label={content.buttons.verify}
                onPress={handleVerifyOTP}
                loading={busy}
                disabled={busy}
              />

              <View style={styles.otpActions}>
                <TouchableOpacity onPress={handleResend} disabled={busy}>
                  <Text style={styles.linkText}>{content.buttons.resend}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setStep("phone");
                    setCode("");
                  }}
                  disabled={busy}
                >
                  <Text style={styles.linkText}>
                    {content.buttons.changeNumber}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {step === "details" ? (
            <View style={styles.form}>
              <MmInput
                label={content.form.shopName}
                placeholder={content.form.shopNamePlaceholder}
                value={shopName}
                onChangeText={(v) => {
                  setShopName(v);
                  if (errors.shopName)
                    setErrors((e) => ({ ...e, shopName: "" }));
                }}
                autoCapitalize="words"
                error={errors.shopName}
              />

              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>{content.form.category}</Text>
                <View style={styles.chips}>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <MmChip
                      key={cat.value}
                      label={cat.label}
                      selected={selectedCategory === cat.value}
                      onPress={() => {
                        setSelectedCategory(cat.value);
                        if (errors.category)
                          setErrors((e) => ({ ...e, category: "" }));
                      }}
                    />
                  ))}
                </View>
                {errors.category ? (
                  <Text style={styles.errorText}>{errors.category}</Text>
                ) : null}
              </View>

              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>{content.form.society}</Text>
                <TouchableOpacity
                  style={[
                    styles.selector,
                    errors.society ? styles.selectorError : null,
                  ]}
                  onPress={() => setShowSocietyPicker(true)}
                >
                  <Text
                    style={
                      selectedSocietyName
                        ? styles.selectorText
                        : styles.selectorPlaceholder
                    }
                  >
                    {loadingSocieties
                      ? "Loading societies..."
                      : selectedSocietyName || content.form.societyPlaceholder}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {errors.society ? (
                  <Text style={styles.errorText}>{errors.society}</Text>
                ) : null}
              </View>

              <MmButton
                label={content.buttons.submit}
                onPress={handleSubmit}
                loading={busy}
                disabled={busy}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SocietyPickerModal
        visible={showSocietyPicker}
        societies={filteredSocieties}
        loading={loadingSocieties}
        selectedId={selectedSocietyId}
        searchQuery={societySearch}
        onClose={() => setShowSocietyPicker(false)}
        onSelect={(society) => {
          setSelectedSocietyId(society.id);
          setSelectedSocietyName(society.name);
          if (errors.society) setErrors((e) => ({ ...e, society: "" }));
          setShowSocietyPicker(false);
          setSocietySearch("");
        }}
        onSearchChange={setSocietySearch}
      />
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 40, gap: 32 },
  header: { gap: 16 },
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
  form: { gap: 16 },
  otpField: { gap: 7 },
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
  loginLink: { alignSelf: "center", marginTop: 4 },
  loginLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.accentDark,
  },
  chipBlock: { gap: 7 },
  chipLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.red[500],
  },
  selector: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorError: { borderColor: colors.red[500] },
  selectorText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
});
