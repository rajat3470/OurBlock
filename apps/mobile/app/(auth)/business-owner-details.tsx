import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { userAppService } from "../../src/services/userAppService";
import { authStateService } from "../../src/services/authStateService";
import { societyService } from "../../src/services/societyService";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { setUser } from "../../src/store/slices/authSlice";
import { Society } from "../../src/types/index";
import { colors, fonts } from "../../src/constants/theme";
import { SocietyPickerModal } from "../../src/components/auth/SocietyPickerModal";
import { ShopImagePicker } from "../../src/components/business-owner/ShopImagePicker";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";
import MmChip from "../../src/components/ui/MmChip";
import MmProgress from "../../src/components/ui/MmProgress";

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

export default function BusinessOwnerDetailsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { register } = useAuth();

  const [step, setStep] = useState(0);

  // Step 0: Personal info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Step 1: Shop info
  const [shopName, setShopName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopImageUrl, setShopImageUrl] = useState<string | null>(null);

  // Society
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [selectedSocietyName, setSelectedSocietyName] = useState("");
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);
  const [societySearch, setSocietySearch] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingSocieties(true);
      try {
        const res = await societyService.getSocieties(1, 100);
        setSocieties(res.data);
      } catch {
        /* non-fatal */
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

  const validateStep = (current: number): boolean => {
    const e: Record<string, string> = {};
    if (current === 0) {
      if (!fullName.trim() || fullName.trim().split(/\s+/).length < 1) e.fullName = "Full name is required";
      if (!email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    }
    if (current === 1) {
      if (!shopName.trim()) e.shopName = "Shop name is required";
      if (!selectedCategory) e.category = "Select a category";
      if (!selectedSocietyId) e.society = "Select your society";
      if (!shopAddress.trim()) e.shopAddress = "Shop address is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = useCallback(() => {
    if (!validateStep(step)) return;
    setStep(1);
  }, [step, fullName, email]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      if (router.canGoBack()) router.back();
      return;
    }
    setStep(0);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(1)) return;

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || firstName;

    setIsLoading(true);
    try {
      // Update the existing user profile with details + register business
      await register(
        {
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          phone: user?.phone || "",
          password: "otp-registered",
          societyId: selectedSocietyId,
          businessName: shopName.trim(),
          businessCategory: selectedCategory,
          businessAddress: shopAddress.trim(),
          businessImageUrl: shopImageUrl || undefined,
        },
        "businessOwner"
      );
      router.replace("/(business-owner)/application-received");
    } catch (err: any) {
      // If registration fails because account exists, try updating profile directly
      try {
        const updatedUser = await userAppService.updateProfile({
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          societyId: selectedSocietyId,
        } as any);
        dispatch(setUser(updatedUser));
        await authStateService.updateUser(updatedUser);
        router.replace("/(business-owner)/dashboard");
      } catch (updateErr: any) {
        Alert.alert(
          "Registration Failed",
          err?.response?.data?.error || err?.message || "Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [fullName, email, shopName, selectedCategory, selectedSocietyId, shopAddress, shopImageUrl, user, register, dispatch]);

  const copy = [
    {
      title: "Tell us about you",
      subtitle: "We need a few personal details to set up your account.",
    },
    {
      title: "About your shop",
      subtitle: "This is what residents in your society will see.",
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
                onChangeText={(v) => {
                  setFullName(v);
                  if (errors.fullName) setErrors((e) => ({ ...e, fullName: "" }));
                }}
                autoCapitalize="words"
                error={errors.fullName}
              />
              <MmInput
                label="EMAIL"
                placeholder="ramesh@email.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((e) => ({ ...e, email: "" }));
                }}
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
                value={shopName}
                onChangeText={(v) => {
                  setShopName(v);
                  if (errors.shopName) setErrors((e) => ({ ...e, shopName: "" }));
                }}
                autoCapitalize="words"
                error={errors.shopName}
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
                        if (errors.category) setErrors((e) => ({ ...e, category: "" }));
                      }}
                    />
                  ))}
                </View>
                {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
              </View>
              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>SOCIETY / SECTOR</Text>
                <TouchableOpacity
                  style={[styles.selector, errors.society ? styles.selectorError : null]}
                  onPress={() => setShowSocietyPicker(true)}
                >
                  <Text style={selectedSocietyName ? styles.selectorText : styles.selectorPlaceholder}>
                    {loadingSocieties
                      ? "Loading societies..."
                      : selectedSocietyName || "e.g. Sector 70, Mohali"}
                  </Text>
                </TouchableOpacity>
                {errors.society ? <Text style={styles.errorText}>{errors.society}</Text> : null}
              </View>
              <MmInput
                label="FULL SHOP ADDRESS"
                placeholder="Shop no., street, landmark"
                value={shopAddress}
                onChangeText={(v) => {
                  setShopAddress(v);
                  if (errors.shopAddress) setErrors((e) => ({ ...e, shopAddress: "" }));
                }}
                error={errors.shopAddress}
              />
              <ShopImagePicker
                uri={shopImageUrl}
                onImageSelected={setShopImageUrl}
                label="Shop Image (optional)"
              />
            </View>
          ) : null}

          <MmButton
            label={step === 1 ? "Submit application" : "Continue"}
            onPress={step === 1 ? handleSubmit : handleContinue}
            loading={isLoading}
          />
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
  header: { gap: 12 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 40, color: colors.textPrimary },
  subtitle: {
    fontFamily: fonts.regular, fontSize: 14, lineHeight: 20,
    letterSpacing: -0.14, color: colors.textSecondary,
  },
  fields: { gap: 16 },
  chipBlock: { gap: 7 },
  chipLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: colors.red[500] },
  selector: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, height: 48, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center",
  },
  selectorError: { borderColor: colors.red[500] },
  selectorText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textPrimary },
  selectorPlaceholder: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
