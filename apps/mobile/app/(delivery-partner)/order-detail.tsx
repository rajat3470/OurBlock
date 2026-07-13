import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";
import {
  deliveryPartnerService,
  invalidateDeliveryQueueCache,
} from "@services/deliveryPartnerService";
import { imageUploadService } from "@services/imageUploadService";
import { pickImageFromCamera } from "@/utils/imagePicker";
import { Order, PaymentMethod } from "@/types";
import { isPaymentOutstanding } from "@mohallamitr/shared";
import { useAppSelector } from "@hooks/useRedux";
import { colors } from "@/constants/theme";

const COLLECT_METHODS: Array<{ key: PaymentMethod; label: string; icon: string }> = [
  { key: "cash", label: "Cash", icon: "💵" },
  { key: "upi", label: "UPI", icon: "📱" },
  { key: "card", label: "Card", icon: "💳" },
];

export default function DeliveryPartnerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("cash");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await deliveryPartnerService.getOrder(id);
      setOrder(data);
      if (data.paymentMethod === "upi" || data.paymentMethod === "card") {
        setCollectMethod(data.paymentMethod);
      }
    } catch (e: any) {
      toast.show(e?.message ?? "Failed to load order", { type: "danger" });
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!order) return;
    try {
      setSubmitting(true);
      const updated = await deliveryPartnerService.startDelivery(order.id);
      invalidateDeliveryQueueCache();
      setOrder(updated);
      toast.show("Marked out for delivery", { type: "success" });
    } catch (e: any) {
      toast.show(e?.response?.data?.error ?? e?.message ?? "Failed to start", { type: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCaptureProof = async () => {
    const picked = await pickImageFromCamera();
    if (!picked) {
      toast.show("Camera permission required to capture delivery proof", { type: "warning" });
      return;
    }
    setProofUri(picked.uri);
    setProofDataUrl(picked.dataUrl);
  };

  const handleComplete = async () => {
    if (!order || !user) return;
    if (!proofUri) {
      toast.show("Take a delivery photo before completing", { type: "warning" });
      return;
    }

    const outstanding = isPaymentOutstanding(order.paymentStatus);
    Alert.alert(
      "Complete delivery",
      outstanding
        ? `Confirm handoff and mark payment collected via ${collectMethod.toUpperCase()}?`
        : "Confirm order handed over to customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              setSubmitting(true);
              let deliveryProofImageUrl = proofDataUrl || proofUri;
              try {
                deliveryProofImageUrl = await imageUploadService.uploadDeliveryProof(
                  proofUri,
                  order.id,
                  user.id
                );
              } catch {
                // Fall back to data URL if storage upload fails in local/dev.
              }

              const updated = await deliveryPartnerService.completeDelivery(order.id, {
                deliveryProofImageUrl,
                ...(outstanding ? { paymentCollectedMethod: collectMethod } : {}),
              });
              invalidateDeliveryQueueCache();
              setOrder(updated);
              toast.show("Delivery completed", { type: "success" });
              router.replace("/(delivery-partner)/dashboard");
            } catch (e: any) {
              toast.show(
                e?.response?.data?.error ?? e?.message ?? "Failed to complete delivery",
                { type: "danger" }
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !order) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0891B2" />
      </View>
    );
  }

  const addr = order.deliveryAddress as any;
  const outstanding = isPaymentOutstanding(order.paymentStatus);
  const canStart = order.status === "ready";
  const canComplete = order.status === "ready" || order.status === "outForDelivery";
  const waitingOnShop =
    order.status === "confirmed" || order.status === "preparing";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{(order as any).userName || "Customer"}</Text>
          {(order as any).userPhone ? (
            <Text style={styles.subValue}>{(order as any).userPhone}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Deliver to</Text>
          <Text style={styles.value}>
            {[addr?.street, addr?.landmark, addr?.city, addr?.state, addr?.pincode]
              .filter(Boolean)
              .join(", ")}
          </Text>
          {addr?.phone ? <Text style={styles.subValue}>{addr.phone}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Order total</Text>
          <Text style={styles.amount}>₹{Number(order.finalAmount).toFixed(0)}</Text>
          <Text style={styles.subValue}>
            {outstanding
              ? `Payment pending · intended ${order.paymentMethod?.toUpperCase() || "CASH"}`
              : "Already paid online"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Items</Text>
          {(order.items as any[]).map((item, idx) => (
            <Text key={`${item.productId}-${idx}`} style={styles.itemLine}>
              {item.quantity}× {item.productName || "Item"} — ₹
              {Number(item.lineTotal ?? item.price * item.quantity).toFixed(0)}
            </Text>
          ))}
        </View>

        {outstanding ? (
          <View style={styles.card}>
            <Text style={styles.label}>Collect payment as</Text>
            <View style={styles.methodRow}>
              {COLLECT_METHODS.map((m) => {
                const selected = collectMethod === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.methodChip, selected ? styles.methodChipActive : null]}
                    onPress={() => setCollectMethod(m.key)}
                  >
                    <Text style={styles.methodIcon}>{m.icon}</Text>
                    <Text style={[styles.methodLabel, selected ? styles.methodLabelActive : null]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Delivery proof photo</Text>
          {proofUri ? (
            <Image source={{ uri: proofUri }} style={styles.proofImage} />
          ) : (
            <Text style={styles.subValue}>Required before marking complete</Text>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCaptureProof}>
            <Text style={styles.secondaryBtnText}>
              {proofUri ? "Retake photo" : "Take photo"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {waitingOnShop ? (
          <View style={styles.waitBanner}>
            <Text style={styles.waitBannerText}>
              Shop is still preparing this order. You can deliver once it’s marked Ready.
            </Text>
          </View>
        ) : null}
        {canStart ? (
          <TouchableOpacity
            style={[styles.primaryBtn, submitting ? styles.btnDisabled : null]}
            disabled={submitting}
            onPress={handleStart}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Start delivery</Text>
            )}
          </TouchableOpacity>
        ) : null}
        {canComplete ? (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              styles.completeBtn,
              submitting ? styles.btnDisabled : null,
              canStart ? { marginTop: 10 } : null,
            ]}
            disabled={submitting}
            onPress={handleComplete}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Mark delivered</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { fontSize: 16, fontWeight: "700", color: "#0891B2", width: 48 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" },
  value: { marginTop: 6, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  subValue: { marginTop: 4, fontSize: 13, color: "#64748B" },
  amount: { marginTop: 6, fontSize: 24, fontWeight: "800", color: "#0E7490" },
  itemLine: { marginTop: 6, fontSize: 14, color: "#334155" },
  methodRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  methodChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  methodChipActive: { borderColor: "#0891B2", backgroundColor: "#ECFEFF" },
  methodIcon: { fontSize: 18 },
  methodLabel: { marginTop: 4, fontSize: 12, fontWeight: "600", color: "#64748B" },
  methodLabelActive: { color: "#0E7490" },
  proofImage: { marginTop: 10, width: "100%", height: 180, borderRadius: 12 },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0891B2",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#0891B2", fontWeight: "700", fontSize: 14 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  primaryBtn: {
    backgroundColor: "#0891B2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  completeBtn: { backgroundColor: "#0E9F6E" },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  waitBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  waitBannerText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
});
