import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { businessOwnerService } from "@services/businessOwnerService";
import content from "@/content/boBankDetails.json";

interface BankDetailsOptions {
  onSuccess?: () => void;
}

export const useBusinessOwnerBankDetails = (opts?: BankDetailsOptions) => {
  const onSuccessRef = useRef(opts?.onSuccess);
  onSuccessRef.current = opts?.onSuccess;
  const { businessProfile, loadBusinessProfile } = useBusinessOwner();

  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const bankDetails = (businessProfile as any)?.bankDetails ?? null;
  const verificationStatus: string | null = bankDetails?.verificationStatus ?? null;
  const verificationNote: string | null = bankDetails?.verificationNote ?? null;
  const isVerified = verificationStatus === "verified";

  useEffect(() => {
    (async () => {
      try {
        const data = await businessOwnerService.getBankDetails();
        if (data) {
          setAccountHolderName(data.accountHolderName || "");
          setIfscCode(data.ifscCode || "");
          setBankName(data.bankName || "");
          setUpiId(data.upiId || "");
          // Account number comes masked — don't pre-fill
        }
      } catch {
        // No bank details yet — that's fine
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!accountHolderName.trim() || accountHolderName.trim().length < 2) {
      errors.accountHolderName = "Name is required (min 2 characters).";
    }
    if (!accountNumber || !/^\d{9,18}$/.test(accountNumber)) {
      errors.accountNumber = "Enter a valid 9-18 digit account number.";
    }
    if (accountNumber !== confirmAccountNumber) {
      errors.confirmAccountNumber = content.alerts.accountMismatch;
    }
    if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) {
      errors.ifscCode = "Enter a valid IFSC code (e.g. SBIN0001234).";
    }
    if (!bankName.trim() || bankName.trim().length < 2) {
      errors.bankName = "Bank name is required.";
    }
    if (upiId && !/^[\w.\-]+@[\w]+$/.test(upiId)) {
      errors.upiId = "Invalid UPI ID format.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [accountHolderName, accountNumber, confirmAccountNumber, ifscCode, bankName, upiId]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const doSubmit = async () => {
      setIsSubmitting(true);
      try {
        const result = await businessOwnerService.submitBankDetails({
          accountHolderName: accountHolderName.trim(),
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          bankName: bankName.trim(),
          upiId: upiId.trim() || undefined,
        });
        await loadBusinessProfile();
        const newStatus = result?.verificationStatus;
        const message =
          newStatus === "verified"
            ? content.status.verifiedSub
            : newStatus === "rejected"
              ? result?.verificationNote || content.status.rejectedSub
              : content.alerts.submitSuccess;
        const title =
          newStatus === "verified" ? content.status.verified
            : newStatus === "rejected" ? content.status.rejected
              : "Submitted";
        Alert.alert(title, message);
        setAccountNumber("");
        setConfirmAccountNumber("");
        if (newStatus !== "rejected") {
          onSuccessRef.current?.();
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.error ||
          error?.message ||
          content.alerts.submitError;
        Alert.alert(content.alerts.errorTitle, msg);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (isVerified) {
      Alert.alert(
        content.alerts.resubmitTitle,
        content.alerts.resubmitMsg,
        [
          { text: content.alerts.resubmitCancel, style: "cancel" },
          { text: content.alerts.resubmitConfirm, onPress: doSubmit },
        ]
      );
    } else {
      await doSubmit();
    }
  }, [validate, accountHolderName, accountNumber, ifscCode, bankName, upiId, isVerified, loadBusinessProfile]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
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
  };
};
