import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { userAppService } from "../../src/services/userAppService";
import { authStateService } from "../../src/services/authStateService";
import { useAppDispatch } from "../../src/hooks/useRedux";
import { setUser } from "../../src/store/slices/authSlice";
import { colors, fonts } from "../../src/constants/theme";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";

export default function DeliveryPartnerDetailsScreen() {
  const dispatch = useAppDispatch();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 1) e.fullName = "Full name is required";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [fullName, email]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || firstName;

    setSaving(true);
    try {
      const profileData: any = { firstName, lastName };
      if (email.trim()) profileData.email = email.trim().toLowerCase();

      const updatedUser = await userAppService.updateProfile(profileData);
      dispatch(setUser(updatedUser));
      await authStateService.updateUser(updatedUser);

      toast.show("Profile updated!", { type: "success" });
      router.replace("/(delivery-partner)/dashboard");
    } catch (error: any) {
      toast.show(error.message || "Failed to save profile", { type: "danger" });
    } finally {
      setSaving(false);
    }
  }, [validate, fullName, email, dispatch, toast]);

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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Delivery Partner</Text>
            </View>
            <Text style={styles.title}>Complete your{"\n"}profile</Text>
            <Text style={styles.subtitle}>
              We need a few details before you can start delivering.
            </Text>
          </View>

          <View style={styles.fields}>
            <MmInput
              label="FULL NAME"
              placeholder="e.g. Ravi Kumar"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                if (errors.fullName) setErrors((e) => ({ ...e, fullName: "" }));
              }}
              autoCapitalize="words"
              autoFocus
              error={errors.fullName}
            />
            <MmInput
              label="EMAIL (OPTIONAL)"
              placeholder="ravi@email.com"
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
  scrollContent: { paddingTop: 12, paddingBottom: 40, gap: 40 },
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
  badgeText: { fontFamily: fonts.medium, fontSize: 12, color: colors.forest[700] },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 40, color: colors.textPrimary },
  subtitle: {
    fontFamily: fonts.regular, fontSize: 14, lineHeight: 20,
    letterSpacing: -0.14, color: colors.textSecondary, maxWidth: 289,
  },
  fields: { gap: 16 },
});
