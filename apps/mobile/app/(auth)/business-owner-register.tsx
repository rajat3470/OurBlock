import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { societyService } from "../../src/services/societyService";
import { Society } from "../../src/types/index";
import { colors } from "../../src/constants/theme";
import BackButton from "../../src/components/BackButton";
import { ShopImagePicker } from "../../src/components/business-owner/ShopImagePicker";

const BUSINESS_CATEGORIES = [
  { label: "🛒  Grocery", value: "grocery" },
  { label: "💊  Pharmacy", value: "pharmacy" },
  { label: "🍽️  Restaurant", value: "restaurant" },
  { label: "⚡  Electronics", value: "electronics" },
  { label: "�  Hardware", value: "hardware" },
  { label: "☕  Café", value: "cafe" },
  { label: "🏋️  Gym", value: "gym" },
  { label: "🏪  Other", value: "other" },
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
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<RegisterForm> & { societyId?: string; businessCategory?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Business category picker
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Shop image
  const [businessImageUrl, setBusinessImageUrl] = useState<string | null>(null);

  // Society picker
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
        // Non-fatal — user can still try submitting; server will validate
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

  const validate = (): boolean => {
    const e: Partial<RegisterForm> & { societyId?: string; businessCategory?: string } = {};
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!selectedCategory) e.businessCategory = "Please select a category";
    if (!form.businessAddress.trim()) e.businessAddress = "Business address is required";
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter a valid 10-digit mobile number";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!selectedSocietyId) e.societyId = "Please select your society";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
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
      router.replace("/(business-owner)/dashboard");
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err?.response?.data?.error || err?.message || "Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Text style={styles.headerIcon}>🏪</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Register as a Business Owner to list and manage your shop
            </Text>
          </View>

          {/* ── Business Details ── */}
          <Text style={styles.sectionHeading}>Business Details</Text>

          {/* Business name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={[styles.input, errors.businessName ? styles.inputError : null]}
              placeholder="e.g. Raj Kirana Store"
              value={form.businessName}
              onChangeText={(v) => setField("businessName", v)}
              autoCapitalize="words"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.businessName ? (
              <Text style={styles.errorText}>{errors.businessName}</Text>
            ) : null}
          </View>

          {/* Business category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, errors.businessCategory ? styles.inputError : null]}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={selectedCategory ? styles.selectorBtnText : styles.selectorBtnPlaceholder}>
                {selectedCategory
                  ? BUSINESS_CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? selectedCategory
                  : "Select a category…"}
              </Text>
              <Text style={styles.selectorChevron}>▼</Text>
            </TouchableOpacity>
            {errors.businessCategory ? (
              <Text style={styles.errorText}>{errors.businessCategory}</Text>
            ) : null}
          </View>

          {/* Business address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Address *</Text>
            <TextInput
              style={[styles.input, errors.businessAddress ? styles.inputError : null]}
              placeholder="e.g. Shop 12, Ground Floor, Block A"
              value={form.businessAddress}
              onChangeText={(v) => setField("businessAddress", v)}
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.businessAddress ? (
              <Text style={styles.errorText}>{errors.businessAddress}</Text>
            ) : null}
          </View>

          {/* Shop image */}
          <ShopImagePicker
            uri={businessImageUrl}
            onImageSelected={setBusinessImageUrl}
            label="Shop Image (optional)"
          />

          {/* ── Owner Details ── */}
          <Text style={styles.sectionHeading}>Owner Details</Text>

          {/* Society selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your Society *</Text>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                errors.societyId ? styles.inputError : null,
              ]}
              onPress={() => setShowSocietyPicker(true)}
              activeOpacity={0.8}
            >
              <Text
                style={
                  selectedSocietyName
                    ? styles.selectorBtnText
                    : styles.selectorBtnPlaceholder
                }
              >
                {loadingSocieties
                  ? "Loading societies…"
                  : selectedSocietyName
                  ? `🏘️  ${selectedSocietyName}`
                  : "Select your society…"}
              </Text>
              <Text style={styles.selectorChevron}>▼</Text>
            </TouchableOpacity>
            {errors.societyId ? (
              <Text style={styles.errorText}>{errors.societyId}</Text>
            ) : null}
          </View>

          {/* First / Last name row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName ? styles.inputError : null]}
                placeholder="e.g. Raj"
                value={form.firstName}
                onChangeText={(v) => setField("firstName", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.firstName ? (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              ) : null}
            </View>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName ? styles.inputError : null]}
                placeholder="e.g. Sharma"
                value={form.lastName}
                onChangeText={(v) => setField("lastName", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.lastName ? (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              ) : null}
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="owner@business.com"
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              placeholder="10-digit mobile number"
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <View
              style={[
                styles.passwordContainer,
                errors.password ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? "🙈" : "👁️"}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View
              style={[
                styles.passwordContainer,
                errors.confirmPassword ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChangeText={(v) => setField("confirmPassword", v)}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showConfirm ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.registerBtn, isLoading ? styles.registerBtnDisabled : null]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(auth)/business-owner-login");
              }
            }}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={BUSINESS_CATEGORIES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.societyItem,
                  item.value === selectedCategory ? styles.societyItemSelected : null,
                ]}
                onPress={() => {
                  setSelectedCategory(item.value);
                  if (errors.businessCategory)
                    setErrors((e) => ({ ...e, businessCategory: undefined }));
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={[styles.societyItemName, item.value === selectedCategory ? styles.societyItemNameSelected : null]}>
                  {item.label}
                </Text>
                {item.value === selectedCategory && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Society Picker Modal */}
      <Modal
        visible={showSocietyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSocietyPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Society</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowSocietyPicker(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearch}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by name or city…"
              value={societySearch}
              onChangeText={setSocietySearch}
              autoCorrect={false}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <FlatList
            data={filteredSocieties}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.societyItem,
                  item.id === selectedSocietyId
                    ? styles.societyItemSelected
                    : null,
                ]}
                onPress={() => {
                  setSelectedSocietyId(item.id);
                  setSelectedSocietyName(item.name);
                  if (errors.societyId)
                    setErrors((e) => ({ ...e, societyId: undefined }));
                  setShowSocietyPicker(false);
                  setSocietySearch("");
                }}
              >
                <View style={styles.societyItemIcon}>
                  <Text>🏘️</Text>
                </View>
                <View style={styles.societyItemInfo}>
                  <Text
                    style={[
                      styles.societyItemName,
                      item.id === selectedSocietyId
                        ? styles.societyItemNameSelected
                        : null,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.societyItemMeta}>
                    {item.city}, {item.state} · {item.pincode}
                  </Text>
                </View>
                {item.id === selectedSocietyId && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyModal}>
                <Text style={styles.emptyModalText}>
                  {loadingSocieties ? "Loading…" : "No societies found"}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Back button rendered last so it captures touches above everything */}
      <BackButton top={insets.top + 12} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#86EFAC",
  },
  headerIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 14,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 18,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeIcon: {
    fontSize: 18,
  },
  selectorBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  selectorBtnPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
  },
  selectorChevron: {
    fontSize: 11,
    color: colors.textMuted,
  },
  registerBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLinkBold: {
    fontWeight: "700",
    color: "#22C55E",
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: "#64748B",
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  societyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  societyItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  societyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  societyItemInfo: {
    flex: 1,
  },
  societyItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  societyItemNameSelected: {
    color: "#16A34A",
  },
  societyItemMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  checkmark: {
    fontSize: 16,
    color: "#22C55E",
    fontWeight: "700",
  },
  emptyModal: {
    padding: 40,
    alignItems: "center",
  },
  emptyModalText: {
    fontSize: 15,
    color: "#94A3B8",
  },
});
