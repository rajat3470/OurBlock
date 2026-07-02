import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";
import { useAuth } from "../../src/hooks/useAuth";
import { societyService } from "../../src/services/societyService";
import { userAppService } from "../../src/services/userAppService";
import { Society } from "../../src/types/index";
import { colors } from "../../src/constants/theme";
import BackButton from "../../src/components/BackButton";

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  password: "",
  confirmPassword: "",
};

export default function UserRegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<RegisterForm> & { societyId?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [profileImageDataUrl, setProfileImageDataUrl] = useState<string | null>(null);

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
    const e: Partial<RegisterForm> & { societyId?: string } = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter a valid 10-digit mobile number";
    if (!form.addressLine.trim()) e.addressLine = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state.trim()) e.state = "State is required";
    if (!form.pincode.trim()) e.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode.trim()))
      e.pincode = "Enter a valid 6-digit pincode";
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
        },
        "user"
      );

      try {
        await userAppService.addAddress({
          type: "home",
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          street: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          phone: form.phone.trim(),
          isDefault: true,
        });
      } catch {
        toast.show(
          "Address save failed. You can add it from Profile > Manage Addresses.",
          { type: "danger" }
        );
      }

      if (profileImageUri) {
        try {
          if (profileImageDataUrl) {
            await userAppService.updateProfile({ profileImageUrl: profileImageDataUrl });
          }
        } catch {
          toast.show(
            "Profile photo upload failed. You can upload it later from Profile.",
            { type: "danger" }
          );
        }
      }

      router.replace({
        pathname: "/(user)/verify-phone",
        params: { fromRegistration: "1" },
      });
    } catch (err: any) {
      toast.show(
        err?.response?.data?.error || err?.message || "Registration failed. Please try again.",
        { type: "danger" }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.show("Please allow photo library access.", { type: "warning" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selected = result.assets[0];
        setProfileImageUri(selected.uri);
        if (selected.base64) {
          const mimeType = selected.mimeType || "image/jpeg";
          setProfileImageDataUrl(`data:${mimeType};base64,${selected.base64}`);
        }
      }
    } catch {
      toast.show("Could not open image picker.", { type: "danger" });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.headerImage} />
              ) : (
                <Text style={styles.headerIcon}>👤</Text>
              )}
            </View>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickProfileImage}>
              <Text style={styles.imagePickerBtnText}>
                {profileImageUri ? "Change Photo" : "Add Profile Photo (Optional)"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join your community and discover local businesses
            </Text>
          </View>

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
                placeholder="e.g. Priya"
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
              placeholder="you@example.com"
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

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, errors.addressLine ? styles.inputError : null]}
              placeholder="Flat/House, Street, Landmark"
              value={form.addressLine}
              onChangeText={(v) => setField("addressLine", v)}
              autoCapitalize="words"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.addressLine ? (
              <Text style={styles.errorText}>{errors.addressLine}</Text>
            ) : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city ? styles.inputError : null]}
                placeholder="e.g. Noida"
                value={form.city}
                onChangeText={(v) => setField("city", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state ? styles.inputError : null]}
                placeholder="e.g. UP"
                value={form.state}
                onChangeText={(v) => setField("state", v)}
                autoCapitalize="words"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.state ? (
                <Text style={styles.errorText}>{errors.state}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={[styles.input, errors.pincode ? styles.inputError : null]}
              placeholder="6-digit pincode"
              value={form.pincode}
              onChangeText={(v) => setField("pincode", v)}
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor={colors.textMuted}
            />
            {errors.pincode ? (
              <Text style={styles.errorText}>{errors.pincode}</Text>
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
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
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
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
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
                router.replace("/(auth)/user-login");
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
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#93C5FD",
  },
  headerIcon: {
    fontSize: 40,
  },
  headerImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  imagePickerBtn: {
    marginBottom: 12,
  },
  imagePickerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
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
    paddingHorizontal: 16,
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
    backgroundColor: "#3B82F6",
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
    color: "#3B82F6",
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
    backgroundColor: "#EFF6FF",
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
    color: "#2563EB",
  },
  societyItemMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  checkmark: {
    fontSize: 16,
    color: "#3B82F6",
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
