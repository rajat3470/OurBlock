import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";
import { societyService } from "../../src/services/societyService";
import { Society } from "../../src/types/index";
import { colors, fonts } from "../../src/constants/theme";
import { ShopImagePicker } from "../../src/components/business-owner/ShopImagePicker";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";
import MmProgress from "../../src/components/ui/MmProgress";
import MmChip from "../../src/components/ui/MmChip";

const BUSINESS_CATEGORIES = [
  { label: "Kirana Store", value: "grocery" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Electronics", value: "electronics" },
  { label: "Hardware", value: "hardware" },
  { label: "Bakery", value: "cafe" },
  { label: "Gym", value: "gym" },
  { label: "Other", value: "other" },
];

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessAddress: string;
}

const EMPTY_FORM: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  businessAddress: "",
};

export default function BusinessOwnerRegisterScreen() {
  const { register } = useAuth();

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<RegisterForm> & { societyId?: string; businessCategory?: string; fullName?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [businessImageUrl, setBusinessImageUrl] = useState<string | null>(null);

  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [selectedSocietyName, setSelectedSocietyName] = useState("");
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);
  const [societySearch, setSocietySearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoadingSocieties(true);
      try {
        const res = await societyService.getSocieties(1, 100);
        setSocieties(res.data);
      } catch {
        /* non-fatal */
      } finally {
        setLoadingSocieties(false);
      }
    };
    fetch();
  }, []);

  const filteredSocieties = societies.filter(
    (s) =>
      s.name.toLowerCase().includes(societySearch.toLowerCase()) ||
      s.city.toLowerCase().includes(societySearch.toLowerCase())
  );

  const setField = (key: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof typeof errors])
      setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const applyFullName = (value: string) => {
    setFullName(value);
    const parts = value.trim().split(/\s+/).filter(Boolean);
    setForm((prev) => ({
      ...prev,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || parts[0] || "",
    }));
    if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
  };

  const validateStep = (current: number): boolean => {
    const e: Partial<RegisterForm> & { societyId?: string; businessCategory?: string; fullName?: string } = {};
    if (current === 0) {
      if (!fullName.trim() || fullName.trim().split(/\s+/).length < 1) e.fullName = "Full name is required";
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
      if (!form.phone.trim()) e.phone = "Phone number is required";
      else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
    }
    if (current === 1) {
      if (!form.businessName.trim()) e.businessName = "Shop name is required";
      if (!selectedCategory) e.businessCategory = "Please select a category";
      if (!form.businessAddress.trim()) e.businessAddress = "Shop address is required";
      if (!selectedSocietyId) e.societyId = "Please select your society";
    }
    if (current === 2) {
      if (!form.password) e.password = "Password is required";
      else if (form.password.length < 8) e.password = "Minimum 8 characters";
      if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
      else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(2, s + 1));
  };

  const handleBack = () => {
    if (step === 0) {
      if (router.canGoBack()) router.back();
      else router.replace("/(auth)/business-owner-login");
      return;
    }
    setStep((s) => s - 1);
  };

  const handleRegister = async () => {
    if (!validateStep(2)) return;
    setIsLoading(true);
    try {
      await register(
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          societyId: selectedSocietyId,
          businessName: form.businessName.trim(),
          businessCategory: selectedCategory,
          businessAddress: form.businessAddress.trim(),
          businessImageUrl: businessImageUrl || undefined,
        },
        "businessOwner"
      );
      router.replace("/(business-owner)/application-received");
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err?.response?.data?.error || err?.message || "Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copy = [
    {
      title: "Let's set up your account",
      subtitle: "First, tell us a bit about you, the person who'll run this storefront.",
    },
    {
      title: "Tell us about your shop",
      subtitle: "This is what residents in your society will see.",
    },
    {
      title: "Secure your account",
      subtitle: "Create a password so you can sign back in and manage orders.",
    },
  ][step];

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
          <MmProgress active={step + 1} />
          <View style={styles.header}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>

          {step === 0 ? (
            <View style={styles.fields}>
              <MmInput
                label="FULL NAME"
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChangeText={applyFullName}
                autoCapitalize="words"
                error={errors.fullName}
              />
              <MmInput
                label="MOBILE NUMBER"
                placeholder="98765 43210"
                prefix="+91"
                value={form.phone}
                onChangeText={(v) => setField("phone", v.replace(/\D/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                error={errors.phone}
              />
              <MmInput
                label="EMAIL"
                placeholder="ramesh@email.com"
                value={form.email}
                onChangeText={(v) => setField("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.fields}>
              <MmInput
                label="SHOP NAME"
                placeholder="e.g. Sharma Kirana Store"
                value={form.businessName}
                onChangeText={(v) => setField("businessName", v)}
                autoCapitalize="words"
                error={errors.businessName}
              />
              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>SHOP CATEGORY</Text>
                <View style={styles.chips}>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <MmChip
                      key={cat.value}
                      label={cat.label}
                      selected={selectedCategory === cat.value}
                      onPress={() => {
                        setSelectedCategory(cat.value);
                        if (errors.businessCategory) setErrors((e) => ({ ...e, businessCategory: undefined }));
                      }}
                    />
                  ))}
                </View>
                {errors.businessCategory ? <Text style={styles.errorText}>{errors.businessCategory}</Text> : null}
              </View>
              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>SOCIETY / SECTOR</Text>
                <TouchableOpacity
                  style={[styles.selector, errors.societyId ? styles.selectorError : null]}
                  onPress={() => setShowSocietyPicker(true)}
                >
                  <Text style={selectedSocietyName ? styles.selectorText : styles.selectorPlaceholder}>
                    {loadingSocieties
                      ? "Loading societies…"
                      : selectedSocietyName || "e.g. Sector 70, Mohali"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {errors.societyId ? <Text style={styles.errorText}>{errors.societyId}</Text> : null}
              </View>
              <MmInput
                label="FULL SHOP ADDRESS"
                placeholder="Shop no., street, landmark"
                value={form.businessAddress}
                onChangeText={(v) => setField("businessAddress", v)}
                error={errors.businessAddress}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.fields}>
              <MmInput
                label="PASSWORD"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                error={errors.password}
              />
              <MmInput
                label="CONFIRM PASSWORD"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChangeText={(v) => setField("confirmPassword", v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                error={errors.confirmPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.showPass}>{showPassword ? "Hide password" : "Show password"}</Text>
              </TouchableOpacity>
              <ShopImagePicker
                uri={businessImageUrl}
                onImageSelected={setBusinessImageUrl}
                label="Shop Image (optional)"
              />
            </View>
          ) : null}

          <MmButton
            label={step === 2 ? "Submit application" : "Continue"}
            onPress={step === 2 ? handleRegister : handleContinue}
            loading={isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSocietyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSocietyPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Society</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSocietyPicker(false)}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by name or city…"
              value={societySearch}
              onChangeText={setSocietySearch}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <FlatList
            data={filteredSocieties}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.societyItem, item.id === selectedSocietyId ? styles.societyItemSelected : null]}
                onPress={() => {
                  setSelectedSocietyId(item.id);
                  setSelectedSocietyName(item.name);
                  if (errors.societyId) setErrors((e) => ({ ...e, societyId: undefined }));
                  setShowSocietyPicker(false);
                  setSocietySearch("");
                }}
              >
                <View style={styles.societyItemInfo}>
                  <Text style={styles.societyItemName}>{item.name}</Text>
                  <Text style={styles.societyItemMeta}>
                    {item.city}, {item.state} · {item.pincode}
                  </Text>
                </View>
                {item.id === selectedSocietyId ? <Text style={styles.checkmark}>✓</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyModal}>
                <Text style={styles.emptyModalText}>{loadingSocieties ? "Loading…" : "No societies found"}</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    gap: 12,
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
  },
  fields: {
    gap: 16,
  },
  chipBlock: {
    gap: 7,
  },
  chipLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  selectorError: {
    borderColor: colors.red[500],
  },
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
  showPass: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalSearch: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  modalSearchInput: {
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  societyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  societyItemSelected: {
    backgroundColor: colors.forest[100],
  },
  societyItemInfo: { flex: 1 },
  societyItemName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  societyItemMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyModal: { padding: 40, alignItems: "center" },
  emptyModalText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
});
