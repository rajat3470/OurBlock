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
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { userAppService } from "../../src/services/userAppService";
import { Address } from "../../src/types";
import { colors } from "../../src/constants/theme";

type AddressType = "home" | "work" | "other";

export default function AddEditAddressScreen() {
  const params = useLocalSearchParams();
  const addressId = params.id as string | undefined;
  const isEdit = !!addressId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    type: "home" as AddressType,
    name: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit) {
      fetchAddress();
    }
  }, [addressId]);

  const fetchAddress = async () => {
    if (!addressId) return;
    setLoading(true);
    try {
      const addresses = await userAppService.getAddresses();
      const address = addresses.find((a) => a.id === addressId);
      if (address) {
        setForm({
          type: address.type,
          name: address.name || "",
          street: address.street,
          landmark: address.landmark || "",
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone,
          isDefault: address.isDefault,
        });
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load address");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.street.trim()) newErrors.street = "Street address is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.state.trim()) newErrors.state = "State is required";
    if (!form.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode))
      newErrors.pincode = "Enter a valid 6-digit pincode";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone))
      newErrors.phone = "Enter a valid 10-digit mobile number";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit && addressId) {
        await userAppService.updateAddress(addressId, form);
        Alert.alert("Success", "Address updated successfully");
      } else {
        await userAppService.addAddress(form);
        Alert.alert("Success", "Address added successfully");
      }
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Edit Address" : "Add Address"}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Address Type */}
          <Text style={styles.label}>Address Type *</Text>
          <View style={styles.typeContainer}>
            {(["home", "work", "other"] as AddressType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeBtn,
                  form.type === type && styles.typeBtnActive,
                ]}
                onPress={() => setField("type", type)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    form.type === type && styles.typeBtnTextActive,
                  ]}
                >
                  {type === "home" ? "🏠 Home" : type === "work" ? "💼 Work" : "📍 Other"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name (Optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Label (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My Home, Office, Parents House"
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Street Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="House no., Building name, Street"
              value={form.street}
              onChangeText={(v) => setField("street", v)}
              multiline
              numberOfLines={2}
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
            {errors.street ? <Text style={styles.errorText}>{errors.street}</Text> : null}
          </View>

          {/* Landmark */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Near City Hospital"
              value={form.landmark}
              onChangeText={(v) => setField("landmark", v)}
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* City and State Row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city ? styles.inputError : null]}
                placeholder="City"
                value={form.city}
                onChangeText={(v) => setField("city", v)}
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state ? styles.inputError : null]}
                placeholder="State"
                value={form.state}
                onChangeText={(v) => setField("state", v)}
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
              {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
            </View>
          </View>

          {/* Pincode */}
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
            {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              placeholder="10-digit mobile number"
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={colors.textMuted}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          {/* Set as Default */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField("isDefault", !form.isDefault)}
          >
            <View style={[styles.checkbox, form.isDefault && styles.checkboxChecked]}>
              {form.isDefault && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Set as default address</Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEdit ? "Update Address" : "Save Address"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  typeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  typeBtnActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: "#3B82F6",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  multilineInput: {
    height: 70,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
