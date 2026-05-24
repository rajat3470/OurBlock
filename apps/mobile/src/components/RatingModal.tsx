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
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function RatingModal({
  visible,
  orderId,
  businessId,
  businessName,
  onClose,
  onSubmitted,
}: Props) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRating(0);
    setComment("");
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (rating === 0) { setError("Please select a star rating."); return; }
    if (comment.trim().length < 5) { setError("Please write at least a few words."); return; }

    setError(null);
    setSubmitting(true);
    try {
      await userAppService.submitReview({ orderId, businessId, rating, comment: comment.trim() });
      reset();
      onSubmitted();
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit review. Please try again.");
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
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Rate your order</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{businessName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Star selector */}
            <Text style={styles.label}>How was your experience?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={38}
                    color={star <= rating ? "#F59E0B" : "#D1D5DB"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </Text>
            )}

            {/* Comment */}
            <Text style={styles.label}>Tell us more</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="What did you like or dislike? (min. 5 characters)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>

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
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submit Review</Text>
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
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
    maxHeight: "90%",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", fontWeight: "500", marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  starBtn: { padding: 4 },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 100,
    backgroundColor: "#FAFAFA",
  },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4, marginBottom: 16 },
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
