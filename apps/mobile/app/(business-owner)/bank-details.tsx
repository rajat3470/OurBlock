import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useBusinessOwnerBankDetails } from "../../src/hooks/useBusinessOwnerBankDetails";
import { colors, fonts, brand } from "../../src/constants/theme";
import MmScreen from "../../src/components/ui/MmScreen";
import MmInput from "../../src/components/ui/MmInput";
import MmButton from "../../src/components/ui/MmButton";

const STATUS_CONFIG = {
  pending: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "time-outline" as const,
    iconColor: "#D97706",
    titleColor: "#92400E",
    bodyColor: "#78350F",
  },
  verified: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "checkmark-circle" as const,
    iconColor: "#059669",
    titleColor: "#065F46",
    bodyColor: "#064E3B",
  },
  rejected: {
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "close-circle" as const,
    iconColor: "#DC2626",
    titleColor: "#991B1B",
    bodyColor: "#7F1D1D",
  },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

export default function BankDetailsScreen() {
  const {
    accountHolderName,
    setAccountHolderName,
    accountNumber,
    setAccountNumber,
    confirmAccountNumber,
    setConfirmAccountNumber,
    ifscCode,
    setIfscCode,
    bankName,
    setBankName,
    upiId,
    setUpiId,
    isSubmitting,
    isLoading,
    fieldErrors,
    clearFieldError,
    handleSubmit,
    verificationStatus,
    verificationNote,
    isVerified,
    bankDetails,
    content,
  } = useBusinessOwnerBankDetails({ onSuccess: () => router.back() });

  const [showEditForm, setShowEditForm] = useState(false);

  if (isLoading) {
    return (
      <MmScreen showBack>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </MmScreen>
    );
  }

  const statusCfg = verificationStatus ? STATUS_CONFIG[verificationStatus as keyof typeof STATUS_CONFIG] : null;
  const isPending = verificationStatus === "pending";
  const isRejected = verificationStatus === "rejected";
  const showForm = !verificationStatus || isRejected || showEditForm;

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
            <Text style={styles.title}>{content.header.title}</Text>
            <Text style={styles.subtitle}>{content.header.subtitle}</Text>
          </View>

          {/* Status Banner */}
          {statusCfg && verificationStatus && (
            <View style={[styles.statusBanner, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
              <Ionicons name={statusCfg.icon} size={22} color={statusCfg.iconColor} style={styles.statusIcon} />
              <View style={styles.statusTextWrap}>
                <Text style={[styles.statusTitle, { color: statusCfg.titleColor }]}>
                  {content.status[verificationStatus as keyof typeof content.status]}
                </Text>
                <Text style={[styles.statusBody, { color: statusCfg.bodyColor }]}>
                  {isRejected && verificationNote
                    ? verificationNote
                    : content.status[`${verificationStatus}Sub` as keyof typeof content.status]}
                </Text>
              </View>
            </View>
          )}

          {!verificationStatus && (
            <View style={[styles.statusBanner, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Ionicons name="card-outline" size={22} color="#D97706" style={styles.statusIcon} />
              <View style={styles.statusTextWrap}>
                <Text style={[styles.statusTitle, { color: "#92400E" }]}>{content.status.notSubmitted}</Text>
                <Text style={[styles.statusBody, { color: "#78350F" }]}>{content.status.notSubmittedSub}</Text>
              </View>
            </View>
          )}

          {/* Submitted Details Summary (pending / verified) */}
          {(isPending || isVerified) && !showEditForm && bankDetails && (
            <View style={styles.summaryCard}>
              <DetailRow label={content.form.accountHolderName} value={bankDetails.accountHolderName} />
              <DetailRow label={content.form.accountNumber} value={bankDetails.accountNumber ? `••••${String(bankDetails.accountNumber).slice(-4)}` : ""} />
              <DetailRow label={content.form.ifscCode} value={bankDetails.ifscCode} />
              <DetailRow label={content.form.bankName} value={bankDetails.bankName} />
              {bankDetails.upiId && <DetailRow label="UPI ID" value={bankDetails.upiId} />}
            </View>
          )}

          {/* Actions for pending / verified (no edit form shown) */}
          {(isPending || isVerified) && !showEditForm && (
            <View style={styles.actionGroup}>
              <MmButton
                label="Go Back"
                onPress={() => router.back()}
              />
              {isVerified && (
                <TouchableOpacity
                  style={styles.editLink}
                  onPress={() => setShowEditForm(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color={brand.primary} />
                  <Text style={styles.editLinkText}>Update bank details</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Edit Form */}
          {showForm && (
            <View style={styles.form}>
              {showEditForm && (
                <View style={[styles.statusBanner, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                  <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
                  <Text style={[styles.statusBody, { color: "#78350F", flex: 1 }]}>
                    {content.alerts.resubmitMsg}
                  </Text>
                </View>
              )}

              <MmInput
                label={content.form.accountHolderName}
                placeholder={content.form.placeholders.accountHolderName}
                value={accountHolderName}
                onChangeText={(v) => { setAccountHolderName(v); clearFieldError("accountHolderName"); }}
                autoCapitalize="words"
                editable={!isSubmitting}
                error={fieldErrors.accountHolderName}
              />
              <MmInput
                label={content.form.accountNumber}
                placeholder={content.form.placeholders.accountNumber}
                value={accountNumber}
                onChangeText={(v) => { setAccountNumber(v.replace(/\D/g, "").slice(0, 18)); clearFieldError("accountNumber"); }}
                keyboardType="number-pad"
                editable={!isSubmitting}
                error={fieldErrors.accountNumber}
              />
              <MmInput
                label={content.form.confirmAccountNumber}
                placeholder={content.form.placeholders.confirmAccountNumber}
                value={confirmAccountNumber}
                onChangeText={(v) => { setConfirmAccountNumber(v.replace(/\D/g, "").slice(0, 18)); clearFieldError("confirmAccountNumber"); }}
                keyboardType="number-pad"
                editable={!isSubmitting}
                error={fieldErrors.confirmAccountNumber}
              />
              <MmInput
                label={content.form.ifscCode}
                placeholder={content.form.placeholders.ifscCode}
                value={ifscCode}
                onChangeText={(v) => { setIfscCode(v.toUpperCase().slice(0, 11)); clearFieldError("ifscCode"); }}
                autoCapitalize="characters"
                editable={!isSubmitting}
                error={fieldErrors.ifscCode}
              />
              <MmInput
                label={content.form.bankName}
                placeholder={content.form.placeholders.bankName}
                value={bankName}
                onChangeText={(v) => { setBankName(v); clearFieldError("bankName"); }}
                autoCapitalize="words"
                editable={!isSubmitting}
                error={fieldErrors.bankName}
              />
              <MmInput
                label={content.form.upiId}
                placeholder={content.form.placeholders.upiId}
                value={upiId}
                onChangeText={(v) => { setUpiId(v.toLowerCase()); clearFieldError("upiId"); }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSubmitting}
                error={fieldErrors.upiId}
              />

              <View style={styles.formActions}>
                <MmButton
                  label={isVerified || isPending ? content.update : content.submit}
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
                {showEditForm && (
                  <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={() => setShowEditForm(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelLinkText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingTop: 12, paddingBottom: 40, gap: 24 },
  header: { gap: 8 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  statusBanner: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
  },
  statusIcon: { marginTop: 1 },
  statusTextWrap: { flex: 1 },
  statusTitle: { fontFamily: fonts.semiBold, fontSize: 14, marginBottom: 2 },
  statusBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 14,
  },
  detailRow: { gap: 2 },
  detailLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  actionGroup: { gap: 14, alignItems: "center" },
  editLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  editLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.primary,
  },
  form: { gap: 14 },
  formActions: { gap: 12, alignItems: "center", marginTop: 4 },
  cancelLink: { paddingVertical: 6 },
  cancelLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
});
