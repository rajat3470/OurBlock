import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";
import { Ionicons } from "@expo/vector-icons";
import { businessOwnerService } from "@services/businessOwnerService";
import content from "@/content/boDeliveryPartners.json";

type Partner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
};

function extractError(e: any, fallback: string) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

export default function DeliveryPartnersScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await businessOwnerService.getDeliveryPartners();
      setPartners(data);
    } catch (e: any) {
      toast.show(extractError(e, content.toasts.failed), { type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password
    ) {
      toast.show("Fill all fields", { type: "warning" });
      return;
    }
    const phone = form.phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.show("Enter a valid 10-digit Indian mobile number", { type: "warning" });
      return;
    }
    if (form.password.length < 8) {
      toast.show("Password must be at least 8 characters", { type: "warning" });
      return;
    }
    try {
      setSaving(true);
      await businessOwnerService.createDeliveryPartner({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone,
        password: form.password,
      });
      setForm(emptyForm);
      setShowForm(false);
      toast.show(content.toasts.created, { type: "success" });
      await load();
    } catch (e: any) {
      toast.show(extractError(e, content.toasts.failed), { type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (partner: Partner) => {
    const next = partner.status === "active" ? "inactive" : "active";
    Alert.alert(
      next === "inactive" ? "Deactivate partner?" : "Activate partner?",
      `${partner.firstName} ${partner.lastName}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: next === "inactive" ? content.actions.deactivate : content.actions.activate,
          style: next === "inactive" ? "destructive" : "default",
          onPress: async () => {
            try {
              await businessOwnerService.setDeliveryPartnerStatus(
                partner.id,
                next as "active" | "inactive"
              );
              toast.show(content.toasts.updated, { type: "success" });
              await load();
            } catch (e: any) {
              toast.show(extractError(e, content.toasts.failed), { type: "danger" });
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={["#16A34A", "#0A7D55"]}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.heroTopSpacer} />
          </View>

          <Text style={styles.heroEmoji}>🛵</Text>
          <Text style={styles.heroTitle}>{content.hero.title}</Text>
          <Text style={styles.heroSub}>{content.hero.subtitle}</Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm((v) => !v)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={showForm ? "close" : "person-add-outline"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.addBtnText}>
              {showForm ? content.form.cancel : content.actions.add}
            </Text>
          </TouchableOpacity>

          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{content.form.title}</Text>
              {(
                [
                  ["firstName", content.form.firstName, "default"],
                  ["lastName", content.form.lastName, "default"],
                  ["email", content.form.email, "email-address"],
                  ["phone", content.form.phone, "phone-pad"],
                  ["password", content.form.password, "default"],
                ] as const
              ).map(([key, label, keyboard]) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[key]}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, [key]: text }))}
                    autoCapitalize={key === "email" ? "none" : "words"}
                    keyboardType={keyboard}
                    secureTextEntry={key === "password"}
                    placeholder={
                      key === "phone"
                        ? "10-digit mobile (starts with 6-9)"
                        : key === "email"
                        ? "partner@email.com"
                        : undefined
                    }
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[styles.saveBtn, saving ? styles.saveBtnDisabled : null]}
                disabled={saving}
                onPress={handleCreate}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{content.form.submit}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color="#16A34A" />
          ) : partners.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🚚</Text>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySub}>{content.empty.subtitle}</Text>
            </View>
          ) : (
            partners.map((partner) => (
              <View key={partner.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {partner.firstName?.[0]?.toUpperCase() || "D"}
                    </Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.name}>
                      {partner.firstName} {partner.lastName}
                    </Text>
                    <Text style={styles.meta}>{partner.email}</Text>
                    <Text style={styles.meta}>{partner.phone}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          partner.status === "active" ? "#ECFDF5" : "#FEF2F2",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: partner.status === "active" ? "#059669" : "#DC2626",
                        fontWeight: "700",
                        fontSize: 11,
                      }}
                    >
                      {partner.status === "active"
                        ? content.status.active
                        : content.status.inactive}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleStatus(partner)}>
                  <Text style={styles.toggleBtnText}>
                    {partner.status === "active"
                      ? content.actions.deactivate
                      : content.actions.activate}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  heroTopSpacer: { flex: 1 },
  heroEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
    maxWidth: 320,
  },
  content: { padding: 16, paddingBottom: 40 },
  addBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  addBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  form: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 10 },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F8FAFC",
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: "#0A7D55",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFF", fontWeight: "800" },
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#059669" },
  cardMeta: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16, fontWeight: "800", color: "#111827" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  meta: { marginTop: 3, fontSize: 13, color: "#64748B" },
  toggleBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  toggleBtnText: { fontSize: 13, fontWeight: "700", color: "#334155" },
});
