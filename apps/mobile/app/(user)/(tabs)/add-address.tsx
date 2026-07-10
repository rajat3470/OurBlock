import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FormInput from "@components/FormInput";
import LoadingScreen from "@components/LoadingScreen";
import ScreenHeader from "@components/ScreenHeader";
import { AddressType, useAddressForm } from "@hooks/useAddressForm";
import content from "@/content/addresses.json";

const ADDRESS_TYPES: AddressType[] = ["home", "work", "other"];

export default function AddEditAddressScreen() {
  const { isEdit, loading, saving, form, errors, setField, handleSave, goBack } =
    useAddressForm();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEdit ? content.form.editTitle : content.form.addTitle}
        onBack={goBack}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>{content.form.typeLabel}</Text>
          <View style={styles.typeContainer}>
            {ADDRESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, form.type === type && styles.typeBtnActive]}
                onPress={() => setField("type", type)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    form.type === type && styles.typeBtnTextActive,
                  ]}
                >
                  {content.form.types[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormInput
            label={content.form.fields.name.label}
            placeholder={content.form.fields.name.placeholder}
            value={form.name}
            onChangeText={(v) => setField("name", v)}
            autoCorrect={false}
          />

          <FormInput
            label={content.form.fields.street.label}
            placeholder={content.form.fields.street.placeholder}
            value={form.street}
            onChangeText={(v) => setField("street", v)}
            error={errors.street}
            multiline
            numberOfLines={2}
            autoCorrect={false}
          />

          <FormInput
            label={content.form.fields.landmark.label}
            placeholder={content.form.fields.landmark.placeholder}
            value={form.landmark}
            onChangeText={(v) => setField("landmark", v)}
            autoCorrect={false}
          />

          <View style={styles.row}>
            <FormInput
              containerStyle={styles.halfField}
              label={content.form.fields.city.label}
              placeholder={content.form.fields.city.placeholder}
              value={form.city}
              onChangeText={(v) => setField("city", v)}
              error={errors.city}
              autoCorrect={false}
            />
            <FormInput
              containerStyle={styles.halfField}
              label={content.form.fields.state.label}
              placeholder={content.form.fields.state.placeholder}
              value={form.state}
              onChangeText={(v) => setField("state", v)}
              error={errors.state}
              autoCorrect={false}
            />
          </View>

          <FormInput
            label={content.form.fields.pincode.label}
            placeholder={content.form.fields.pincode.placeholder}
            value={form.pincode}
            onChangeText={(v) => setField("pincode", v)}
            error={errors.pincode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <FormInput
            label={content.form.fields.phone.label}
            placeholder={content.form.fields.phone.placeholder}
            value={form.phone}
            onChangeText={(v) => setField("phone", v)}
            error={errors.phone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setField("isDefault", !form.isDefault)}
          >
            <View style={[styles.checkbox, form.isDefault && styles.checkboxChecked]}>
              {form.isDefault && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{content.form.setDefaultLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEdit ? content.form.saveEdit : content.form.saveAdd}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  flex: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    borderColor: "#0E9F6E",
    backgroundColor: "#ECFDF5",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeBtnTextActive: {
    color: "#0E9F6E",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
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
    backgroundColor: "#0E9F6E",
    borderColor: "#0E9F6E",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: "#F59E0B",
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
