import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { userAppService } from "../services/userAppService";

interface Props {
  visible: boolean;
  orderId: string;
  orderAmount: number;
  businessName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const REASONS: { key: string; label: string; icon: string }[] = [
  { key: "wrong_item", label: "Wrong item received", icon: "swap-horizontal-outline" },
  { key: "missing_item", label: "Item(s) missing", icon: "alert-circle-outline" },
  { key: "quality_issue", label: "Poor quality", icon: "thumbs-down-outline" },
  { key: "damaged", label: "Item damaged", icon: "warning-outline" },
  { key: "other", label: "Other reason", icon: "ellipsis-horizontal-circle-outline" },
];

export default function RefundModal({
  visible,
  orderId,
  orderAmount,
  businessName,
  onClose,
  onSubmitted,
}: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason("");
    setComment("");
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!reason) { setError("Please select a reason."); return; }
    if (comment.trim().length < 5) { setError("Please describe the issue (min. 5 characters)."); return; }

    setError(null);
    setSubmitting(true);
    try {
      await userAppService.submitRefund({ orderId, reason, comment: comment.trim() });
      reset();
      onSubmitted();
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="return-up-back-outline" size={22} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Request Refund</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{businessName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Order info chip */}
          <View style={styles.orderChip}>
            <Ionicons name="receipt-outline" size={14} color="#92400E" />
            <Text style={styles.orderChipText}>
              Order #{orderId.slice(0, 8).toUpperCase()} · Rs {orderAmount}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Reason selector */}
            <Text style={styles.label}>What went wrong?</Text>
            <View style={styles.reasonsList}>
              {REASONS.map((r) => {
                const selected = reason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.reasonItem, selected && styles.reasonItemActive]}
                    onPress={() => setReason(r.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={18}
                      color={selected ? "#DC2626" : "#6B7280"}
                    />
                    <Text style={[styles.reasonLabel, selected && styles.reasonLabelActive]}>
                      {r.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={16} color="#DC2626" style={{ marginLeft: "auto" }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Comment */}
            <Text style={styles.label}>Describe the issue</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Tell us what happened with your order..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>

            {/* Info note */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={14} color="#1D4ED8" />
              <Text style={styles.infoText}>
                Our team will review your request and respond within 24–48 hours.
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submit Refund Request</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", fontWeight: "500", marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
    alignSelf: "flex-start",
  },
  orderChipText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 10 },
  reasonsList: { gap: 8, marginBottom: 20 },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },
  reasonItemActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  reasonLabel: { fontSize: 14, color: "#374151", fontWeight: "600", flex: 1 },
  reasonLabelActive: { color: "#DC2626" },
  commentInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 90,
    backgroundColor: "#FAFAFA",
  },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4, marginBottom: 14 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: { fontSize: 12, color: "#1D4ED8", fontWeight: "500", flex: 1, lineHeight: 18 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { fontSize: 12, color: "#DC2626", fontWeight: "600", flex: 1 },
  submitBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
