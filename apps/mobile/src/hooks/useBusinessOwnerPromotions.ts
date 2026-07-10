import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { businessOwnerService } from "@services/businessOwnerService";
import content from "@/content/boPromotions.json";

export interface Coupon {
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

export interface CouponForm {
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

export function formatExpiry(val: any): string {
  if (!val) return content.card.noExpiry;
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function getUsageLabel(count: number, limit?: number | null) {
  if (limit) {
    return content.card.usageWithLimit.replace("{count}", String(count)).replace("{limit}", String(limit));
  }
  return content.card.usage.replace("{count}", String(count));
}

/**
 * Encapsulates all logic for the business owner promotions screen: coupon list,
 * create modal, refresh, activation/deactivation, and formatting helpers.
 */
export const useBusinessOwnerPromotions = () => {
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCoupons().finally(() => setRefreshing(false));
  }, [loadCoupons]);

  const handleCreate = useCallback(async () => {
    const val = parseFloat(form.value);
    if (!form.code.trim()) {
      Alert.alert(content.alerts.missingCodeTitle, content.alerts.missingCodeMsg);
      return;
    }
    if (!val || val <= 0) {
      Alert.alert(content.alerts.invalidValueTitle, content.alerts.invalidValueMsg);
      return;
    }
    if (form.type === "percentage" && val > 80) {
      Alert.alert(content.alerts.tooHighTitle, content.alerts.tooHighMsg);
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
      const msg = err?.response?.data?.error ?? err?.message ?? content.alerts.createErrorFallback;
      Alert.alert(content.alerts.errorTitle, msg);
    } finally {
      setSubmitting(false);
    }
  }, [form, loadCoupons]);

  const handleDeactivate = useCallback((coupon: Coupon) => {
    Alert.alert(
      content.alerts.deactivateTitle,
      content.alerts.deactivateMsg.replace("{code}", coupon.code),
      [
        { text: content.alerts.cancel, style: "cancel" },
        {
          text: content.alerts.deactivateAction,
          style: "destructive",
          onPress: async () => {
            try {
              await businessOwnerService.deleteCoupon(coupon.id);
              await loadCoupons();
            } catch {
              Alert.alert(content.alerts.errorTitle, content.alerts.deactivateError);
            }
          },
        },
      ]
    );
  }, [loadCoupons]);

  const setFormField = useCallback(<K extends keyof CouponForm>(field: K, value: CouponForm[K]) => {
    setForm((p) => ({ ...p, [field]: value }));
  }, []);

  const setType = useCallback((type: CouponForm["type"]) => {
    setForm((p) => ({ ...p, type }));
  }, []);

  const closeModal = useCallback(() => setShowModal(false), []);
  const openModal = useCallback(() => setShowModal(true), []);

  const cardHelpers = useMemo(() => ({
    formatExpiry,
    getUsageLabel,
  }), []);

  return {
    insets,
    coupons,
    loading,
    showModal,
    form,
    submitting,
    refreshing,
    loadCoupons,
    onRefresh,
    handleCreate,
    handleDeactivate,
    setFormField,
    setType,
    closeModal,
    openModal,
    content,
    cardHelpers,
  };
};
