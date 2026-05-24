import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { businessOwnerService } from "../../src/services/businessOwnerService";
import { gradients } from "../../src/constants/theme";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  status: "active" | "inactive";
  description?: string;
  expiresAt?: any;
}

interface CouponForm {
  code: string;
  type: "percentage" | "flat";
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  expiresAt: string;
  description: string;
}

const EMPTY_FORM: CouponForm = {
  code: "",
  type: "percentage",
  value: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  expiresAt: "",
  description: "",
};

function formatExpiry(val: any): string {
  if (!val) return "No expiry";
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

export default function OwnerPromotions() {
  const insets = useSafeAreaInsets();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await businessOwnerService.getMyCoupons();
      setCoupons(data as Coupon[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoupons().finally(() => setRefreshing(false));
  };

  async function handleCreate() {
    const val = parseFloat(form.value);
    if (!form.code.trim()) { Alert.alert("Missing Code", "Enter a coupon code."); return; }
    if (!val || val <= 0) { Alert.alert("Invalid Value", "Enter a valid discount value."); return; }
    if (form.type === "percentage" && val > 80) {
      Alert.alert("Too High", "Discount percentage cannot exceed 80%.");
      return;
    }

    setSubmitting(true);
    try {
      await businessOwnerService.createCoupon({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: val,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
        expiresAt: form.expiresAt || undefined,
        description: form.description.trim() || undefined,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      await loadCoupons();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to create coupon.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(coupon: Coupon) {
    Alert.alert("Deactivate Coupon", `Deactivate "${coupon.code}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          try {
            await businessOwnerService.deleteCoupon(coupon.id);
            await loadCoupons();
          } catch { Alert.alert("Error", "Could not deactivate coupon."); }
        },
      },
    ]);
  }

  const renderCoupon = ({ item }: { item: Coupon }) => {
    const isActive = item.status === "active";
    const usageLabel = item.usageLimit
      ? `${item.usageCount}/${item.usageLimit} used`
      : `${item.usageCount} used`;

    return (
      <View style={[styles.couponCard, !isActive && styles.couponCardInactive]}>
        <View style={styles.couponTop}>
          <View style={styles.couponLeft}>
            <View style={styles.couponCodeWrap}>
              <Text style={styles.couponCode}>{item.code}</Text>
              <View style={[styles.statusPill, { backgroundColor: isActive ? "#DCFCE7" : "#F1F5F9" }]}>
                <Text style={[styles.statusPillText, { color: isActive ? "#16A34A" : "#94A3B8" }]}>
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <Text style={styles.couponDesc} numberOfLines={1}>
              {item.description || (item.type === "percentage" ? `${item.value}% off` : `₹${item.value} off`)}
            </Text>
          </View>
          <View style={styles.couponValueWrap}>
            <Text style={styles.couponValue}>
              {item.type === "percentage" ? `${item.value}%` : `₹${item.value}`}
            </Text>
            <Text style={styles.couponValueLabel}>
              {item.type === "percentage" ? "discount" : "flat off"}
            </Text>
          </View>
        </View>

        <View style={styles.couponMeta}>
          {item.minOrderAmount > 0 && (
            <View style={styles.metaTag}><Text style={styles.metaTagText}>Min ₹{item.minOrderAmount}</Text></View>
          )}
          {item.maxDiscount && (
            <View style={styles.metaTag}><Text style={styles.metaTagText}>Max ₹{item.maxDiscount}</Text></View>
          )}
          <View style={styles.metaTag}><Text style={styles.metaTagText}>{usageLabel}</Text></View>
          <View style={styles.metaTag}><Text style={styles.metaTagText}>Exp: {formatExpiry(item.expiresAt)}</Text></View>
        </View>

        {isActive && (
          <TouchableOpacity
            style={styles.deactivateBtn}
            onPress={() => handleDeactivate(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
            <Text style={styles.deactivateBtnText}>Deactivate</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradients.businessOwner]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Promotions</Text>
            <Text style={styles.headerSub}>Manage your coupon codes</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#16A34A" />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={coupons}
        keyExtractor={(c) => c.id}
        renderItem={renderCoupon}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color="#16A34A" />
            </View>
          ) : (
            <View style={styles.centerWrap}>
              <Text style={styles.emptyEmoji}>🏷️</Text>
              <Text style={styles.emptyTitle}>No promotions yet</Text>
              <Text style={styles.emptySub}>Create your first coupon to attract customers.</Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setShowModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyCreateBtnText}>Create Coupon</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Create Coupon Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Coupon</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Code */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Coupon Code *</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.code}
                  onChangeText={(v) => setForm((p) => ({ ...p, code: v.toUpperCase() }))}
                  placeholder="e.g. SAVE20"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={20}
                />
              </View>

              {/* Type toggle */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Discount Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeChip, form.type === "percentage" && styles.typeChipActive]}
                    onPress={() => setForm((p) => ({ ...p, type: "percentage" }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeChipText, form.type === "percentage" && styles.typeChipTextActive]}>
                      % Percentage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, form.type === "flat" && styles.typeChipActive]}
                    onPress={() => setForm((p) => ({ ...p, type: "flat" }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeChipText, form.type === "flat" && styles.typeChipTextActive]}>
                      ₹ Flat Amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Value */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {form.type === "percentage" ? "Discount % *" : "Discount Amount (₹) *"}
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={form.value}
                  onChangeText={(v) => setForm((p) => ({ ...p, value: v }))}
                  placeholder={form.type === "percentage" ? "e.g. 20" : "e.g. 50"}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>

              {/* Min Order */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Min Order Amount (₹)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.minOrderAmount}
                  onChangeText={(v) => setForm((p) => ({ ...p, minOrderAmount: v }))}
                  placeholder="e.g. 100 (optional)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>

              {/* Max Discount (only for percentage) */}
              {form.type === "percentage" && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Max Discount Cap (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.maxDiscount}
                    onChangeText={(v) => setForm((p) => ({ ...p, maxDiscount: v }))}
                    placeholder="e.g. 100 (optional cap)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Usage limit */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Usage Limit (total redemptions)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.usageLimit}
                  onChangeText={(v) => setForm((p) => ({ ...p, usageLimit: v }))}
                  placeholder="e.g. 100 (leave empty for unlimited)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>

              {/* Expiry */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Expiry Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.expiresAt}
                  onChangeText={(v) => setForm((p) => ({ ...p, expiresAt: v }))}
                  placeholder="e.g. 2026-12-31 (optional)"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (shown to customers)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.description}
                  onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                  placeholder="e.g. Get 20% off on orders above ₹200"
                  placeholderTextColor="#94A3B8"
                  maxLength={100}
                />
              </View>

              <TouchableOpacity
                style={[styles.createBtn, submitting && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="pricetag-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.createBtnText}>Create Coupon</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  headerSub: { marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#16A34A" },

  list: { padding: 16, paddingBottom: 130 },

  couponCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  couponCardInactive: { opacity: 0.5 },
  couponTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  couponLeft: { flex: 1, gap: 4 },
  couponCodeWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponCode: { fontSize: 17, fontWeight: "800", color: "#0F172A", letterSpacing: 1 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  couponDesc: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  couponValueWrap: { alignItems: "flex-end", gap: 2 },
  couponValue: { fontSize: 22, fontWeight: "800", color: "#16A34A" },
  couponValueLabel: { fontSize: 10, color: "#64748B", fontWeight: "600" },

  couponMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaTag: { backgroundColor: "#F1F5F9", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  metaTagText: { fontSize: 11, color: "#475569", fontWeight: "600" },

  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  deactivateBtnText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#334155" },
  emptySub: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingHorizontal: 40 },
  emptyCreateBtn: {
    marginTop: 12,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyCreateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  // Modal / Sheet
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  formInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FAFAFA",
    fontWeight: "500",
  },

  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  typeChipActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  typeChipText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  typeChipTextActive: { color: "#166534", fontWeight: "700" },

  createBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnDisabled: { backgroundColor: "#86EFAC", shadowOpacity: 0, elevation: 0 },
  createBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
