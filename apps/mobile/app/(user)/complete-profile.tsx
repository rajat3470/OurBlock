import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { userAppService } from "../../src/services/userAppService";
import { authStateService } from "../../src/services/authStateService";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { setUser } from "../../src/store/slices/authSlice";
import { colors, fonts } from "../../src/constants/theme";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";

export default function CompleteProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const toast = useToast();
  const params = useLocalSearchParams<{ next?: string }>();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const needsAddress = !(user as any)?.addresses?.length;

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (needsAddress) {
      if (!street.trim()) e.street = "Street address is required";
      if (!city.trim()) e.city = "City is required";
      if (!state.trim()) e.state = "State is required";
      if (!pincode.trim()) e.pincode = "Pincode is required";
      else if (!/^\d{6}$/.test(pincode)) e.pincode = "Enter a valid 6-digit pincode";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [firstName, lastName, street, city, state, pincode, needsAddress]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const profileData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      if (email.trim()) profileData.email = email.trim().toLowerCase();

      const updatedUser = await userAppService.updateProfile(profileData);
      dispatch(setUser(updatedUser));
      await authStateService.updateUser(updatedUser);

      if (needsAddress) {
        await userAppService.addAddress({
          type: "home",
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          phone: user?.phone || "",
          isDefault: true,
        });
      }

      toast.show("Profile updated!", { type: "success" });

      if (params.next === "checkout") {
        router.replace("/(user)/checkout");
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(user)/home");
      }
    } catch (error: any) {
      toast.show(error.message || "Failed to save profile", { type: "danger" });
    } finally {
      setSaving(false);
    }
  }, [
    validate, firstName, lastName, email, street, city, state, pincode,
    user, needsAddress, dispatch, toast, params.next,
  ]);

  return (
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
            <Text style={styles.title}>Complete your{"\n"}profile</Text>
            <Text style={styles.subtitle}>
              We need a few details to deliver your order.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
            <View style={styles.row}>
              <MmInput
                label="FIRST NAME"
                placeholder="e.g. Rahul"
                value={firstName}
                onChangeText={(v) => {
                  setFirstName(v);
                  if (errors.firstName) setErrors((e) => ({ ...e, firstName: "" }));
                }}
                autoCapitalize="words"
                error={errors.firstName}
                containerStyle={styles.half}
              />
              <MmInput
                label="LAST NAME"
                placeholder="e.g. Sharma"
                value={lastName}
                onChangeText={(v) => {
                  setLastName(v);
                  if (errors.lastName) setErrors((e) => ({ ...e, lastName: "" }));
                }}
                autoCapitalize="words"
                error={errors.lastName}
                containerStyle={styles.half}
              />
            </View>
            <MmInput
              label="EMAIL (OPTIONAL)"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {needsAddress ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
              <MmInput
                label="STREET / FLAT / HOUSE"
                placeholder="Flat 201, Tower B, Green Park"
                value={street}
                onChangeText={(v) => {
                  setStreet(v);
                  if (errors.street) setErrors((e) => ({ ...e, street: "" }));
                }}
                error={errors.street}
              />
              <View style={styles.row}>
                <MmInput
                  label="CITY"
                  placeholder="e.g. Noida"
                  value={city}
                  onChangeText={(v) => {
                    setCity(v);
                    if (errors.city) setErrors((e) => ({ ...e, city: "" }));
                  }}
                  error={errors.city}
                  containerStyle={styles.half}
                />
                <MmInput
                  label="STATE"
                  placeholder="e.g. UP"
                  value={state}
                  onChangeText={(v) => {
                    setState(v);
                    if (errors.state) setErrors((e) => ({ ...e, state: "" }));
                  }}
                  error={errors.state}
                  containerStyle={styles.half}
                />
              </View>
              <MmInput
                label="PINCODE"
                placeholder="6-digit pincode"
                value={pincode}
                onChangeText={(v) => {
                  setPincode(v.replace(/\D/g, "").slice(0, 6));
                  if (errors.pincode) setErrors((e) => ({ ...e, pincode: "" }));
                }}
                keyboardType="number-pad"
                maxLength={6}
                error={errors.pincode}
              />
            </View>
          ) : null}

          <MmButton
            label="Save & Continue"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    color: colors.textSecondary,
    maxWidth: 289,
  },
  section: {
    gap: 14,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
});
