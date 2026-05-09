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
  Clipboard,
  Modal,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSuperAdmin } from "../../src/hooks/useSuperAdmin";
import { Society } from "../../src/types/index";

interface OwnerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: OwnerForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

export default function CreateBusinessOwnerScreen() {
  const { societyId: paramSocietyId, societyName: paramSocietyName } =
    useLocalSearchParams<{
      societyId?: string;
      societyName?: string;
    }>();

  const { createBusinessOwner, societies, loadSocieties, isLoading } =
    useSuperAdmin();

  // If admin arrived without a pre-selected society, let them pick one
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(
    paramSocietyId ?? ""
  );
  const [selectedSocietyName, setSelectedSocietyName] = useState<string>(
    paramSocietyName ?? ""
  );
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);
  const [societySearch, setSocietySearch] = useState("");

  const [form, setForm] = useState<OwnerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<OwnerForm> & { societyId?: string }>({});
  const [credentials, setCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  // Load societies list if not pre-filled (for the inline picker)
  useEffect(() => {
    if (!paramSocietyId) {
      loadSocieties();
    }
  }, [paramSocietyId, loadSocieties]);

  const filteredSocieties = societies.filter(
    (s: Society) =>
      s.name.toLowerCase().includes(societySearch.toLowerCase()) ||
      s.city.toLowerCase().includes(societySearch.toLowerCase())
  );

  const setField = (key: keyof OwnerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<OwnerForm> & { societyId?: string } = {};
    if (!selectedSocietyId) e.societyId = "Please select a society";
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter a valid 10-digit mobile number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const result = await createBusinessOwner({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        societyId: selectedSocietyId,
      });
      setCredentials({
        email: result.email,
        temporaryPassword: result.temporaryPassword,
      });
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err?.response?.data?.error || err?.message || "Something went wrong."
      );
    }
  };

  const handleCopyPassword = () => {
    if (credentials) {
      Clipboard.setString(credentials.temporaryPassword);
      Alert.alert("Copied", "Temporary password copied to clipboard.");
    }
  };

  const handleDone = () => {
    router.back();
  };

  // ─── Credentials display ────────────────────────────────────────────────────

  if (credentials) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>Account Created</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          contentContainerStyle={styles.credentialsContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>

          <Text style={styles.successTitle}>Business Owner Account Ready</Text>
          <Text style={styles.successSubtitle}>
            Share the credentials below securely with the business owner. They
            must change their password on first login.
          </Text>

          <View style={styles.credBox}>
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Email</Text>
              <Text style={styles.credValue}>{credentials.email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Temp Password</Text>
              <Text style={styles.credValueMono}>
                {credentials.temporaryPassword}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopyPassword}
            activeOpacity={0.8}
          >
            <Text style={styles.copyBtnText}>📋  Copy Password</Text>
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️  Do not share these credentials over an unsecured channel. The
              business owner should change their password immediately after
              logging in.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Form ───────────────────────────────────────────────────────────────────

  type FieldConfig = {
    key: keyof OwnerForm;
    label: string;
    placeholder: string;
    keyboardType?: "default" | "email-address" | "phone-pad";
    autoCapitalize?: "none" | "words" | "sentences" | "characters";
  };

  const fields: FieldConfig[] = [
    {
      key: "firstName",
      label: "First Name *",
      placeholder: "e.g. Raj",
      autoCapitalize: "words",
    },
    {
      key: "lastName",
      label: "Last Name *",
      placeholder: "e.g. Sharma",
      autoCapitalize: "words",
    },
    {
      key: "email",
      label: "Email Address *",
      placeholder: "owner@example.com",
      keyboardType: "email-address",
      autoCapitalize: "none",
    },
    {
      key: "phone",
      label: "Mobile Number *",
      placeholder: "10-digit number",
      keyboardType: "phone-pad",
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Business Owner</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionNote}>
            A temporary password will be generated and shown to you after
            submission. Share it securely with the business owner.
          </Text>

          {/* Society selector */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Society *</Text>
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
                {selectedSocietyName
                  ? `🏘️  ${selectedSocietyName}`
                  : "Select a society…"}
              </Text>
              <Text style={styles.selectorChevron}>▼</Text>
            </TouchableOpacity>
            {errors.societyId ? (
              <Text style={styles.errorText}>{errors.societyId}</Text>
            ) : null}
          </View>

          {fields.map((field) => (
            <View key={field.key} style={styles.fieldWrapper}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[styles.input, errors[field.key] ? styles.inputError : null]}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChangeText={(v) => setField(field.key, v)}
                keyboardType={field.keyboardType ?? "default"}
                autoCapitalize={field.autoCapitalize ?? "sentences"}
                autoCorrect={false}
                placeholderTextColor="#94A3B8"
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
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
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
            <Text style={styles.modalTitle}>Select Society</Text>
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
              placeholder="Search societies…"
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
                    {item.city}, {item.state}
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
                  {isLoading ? "Loading societies…" : "No societies found"}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 18,
    color: "#0F172A",
  },
  headerLeft: { width: 36 },
  headerRight: { width: 36 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  societyBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  societyBadgeText: {
    fontSize: 14,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  sectionNote: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 20,
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Credentials screen
  credentialsContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 56,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  credBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
  },
  credRow: {
    paddingVertical: 10,
  },
  credLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  credValue: {
    fontSize: 15,
    color: "#0F172A",
  },
  credValueMono: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  copyBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  copyBtnText: {
    color: "#1D4ED8",
    fontSize: 15,
    fontWeight: "600",
  },
  warningBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
    width: "100%",
    borderLeftWidth: 3,
    borderLeftColor: "#F97316",
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 19,
  },
  doneBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Society selector
  selectorBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorBtnText: {
    fontSize: 15,
    color: "#0F172A",
    flex: 1,
  },
  selectorBtnPlaceholder: {
    fontSize: 15,
    color: "#94A3B8",
    flex: 1,
  },
  selectorChevron: {
    fontSize: 11,
    color: "#94A3B8",
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
    color: "#007AFF",
  },
  societyItemMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  checkmark: {
    fontSize: 16,
    color: "#007AFF",
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
