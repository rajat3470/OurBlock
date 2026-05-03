import React, { useState, useEffect } from "react";
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
import { useSuperAdmin } from "../../src/hooks/useSuperAdmin";

interface SocietyForm {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
}

const EMPTY_FORM: SocietyForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  description: "",
};

export default function CreateSocietyScreen() {
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  const isEditing = mode === "edit";

  const { societies, createSociety, updateSociety, isLoading } =
    useSuperAdmin();

  const [form, setForm] = useState<SocietyForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<SocietyForm>>({});

  useEffect(() => {
    if (isEditing && id) {
      const found = societies.find((s) => s.id === id);
      if (found) {
        setForm({
          name: found.name,
          address: found.address,
          city: found.city,
          state: found.state,
          pincode: found.pincode,
          description: found.description ?? "",
        });
      }
    }
  }, [isEditing, id, societies]);

  const setField = (key: keyof SocietyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<SocietyForm> = {};
    if (!form.name.trim()) e.name = "Society name is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state.trim()) e.state = "State is required";
    if (!form.pincode.trim()) e.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode))
      e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (isEditing && id) {
        await updateSociety(id, form);
        Alert.alert("Success", "Society updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await createSociety(form);
        Alert.alert("Success", "Society created successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  type FieldConfig = {
    key: keyof SocietyForm;
    label: string;
    placeholder: string;
    multiline?: boolean;
    numeric?: boolean;
  };

  const fields: FieldConfig[] = [
    {
      key: "name",
      label: "Society Name *",
      placeholder: "e.g. Green Valley Society",
    },
    {
      key: "address",
      label: "Address *",
      placeholder: "Full street address",
      multiline: true,
    },
    { key: "city", label: "City *", placeholder: "e.g. Mumbai" },
    { key: "state", label: "State *", placeholder: "e.g. Maharashtra" },
    {
      key: "pincode",
      label: "Pincode *",
      placeholder: "6-digit pincode",
      numeric: true,
    },
    {
      key: "description",
      label: "Description",
      placeholder: "Optional: describe this society",
      multiline: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? "Edit Society" : "New Society"}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {fields.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[
                  styles.input,
                  field.multiline ? styles.textArea : null,
                  errors[field.key] ? styles.inputError : null,
                ]}
                placeholder={field.placeholder}
                placeholderTextColor="#94A3B8"
                value={form[field.key]}
                onChangeText={(v) => setField(field.key, v)}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 3 : 1}
                keyboardType={field.numeric ? "numeric" : "default"}
                editable={!isLoading}
              />
              {errors[field.key] ? (
                <Text style={styles.errorText}>{errors[field.key]}</Text>
              ) : null}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, isLoading ? styles.submitBtnDisabled : null]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isEditing ? "Update Society" : "Create Society"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 26,
    color: "#007AFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 48,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
    paddingTop: 13,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    marginLeft: 4,
  },
  submitBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: "#93C5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
