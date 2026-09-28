import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useAppSelector } from "@hooks/useRedux";
import { useUserApp } from "@hooks/useUserApp";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import { userAppService } from "@services/userAppService";
import { paymentService, CardDetails } from "@services/paymentService";
import { getBusinessStatus } from "@utils/businessStatus";
import { Address } from "@/types";
import { ORDER_FEES } from "@/constants";
import content from "@/content/checkout.json";

export const PAYMENT_METHODS = [
  { key: "cash" as const, icon: "💵" },
  { key: "upi" as const, icon: "📱" },
  { key: "card" as const, icon: "💳" },
];

export type PaymentMethod = "cash" | "upi" | "card";
export type PaymentTiming = "atOrder" | "atDelivery";

export const useCheckout = () => {
  const toast = useToast();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const { placeOrder, isLoading, businesses } = useUserApp();

  const { values: ffValues } = useFeatureFlags();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>("atDelivery");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    holderName: "",
    number: "",
    expiryMM: "",
    expiryYY: "",
    cvv: "",
  });
  const [upiId, setUpiId] = useState("");
  const orderPlacedRef = useRef(false);

  const PLATFORM_FEE = ffValues.platformFeeAmount ?? ORDER_FEES.PLATFORM_FEE;
  const MINIMUM_ORDER = ffValues.minimumOrderAmount ?? ORDER_FEES.MINIMUM_ORDER;

  const subTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const baseAmount = subTotal + PLATFORM_FEE - discountAmount;
  const pgFeePercent = paymentMethod === "card"
    ? (ffValues.cardFeePercent ?? 0)
    : paymentMethod === "upi"
    ? (ffValues.upiFeePercent ?? 0)
    : 0;
  const paymentGatewayFee = pgFeePercent > 0
    ? Math.round(baseAmount * pgFeePercent) / 100
    : 0;
  const finalAmount = baseAmount + paymentGatewayFee;

  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const data = await userAppService.getAddresses();
      setAddresses(data);
      const def = data.find((a) => a.isDefault) ?? data[0];
      if (def) setSelectedAddressId(def.id);
    } catch {
      toast.show(content.toasts.loadAddressFailed, { type: "danger" });
    } finally {
      setLoadingAddresses(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    if (cartItems.length === 0 && !orderPlacedRef.current) {
      router.replace("/(user)/home");
    }
  }, [cartItems]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      toast.show(content.toasts.enterCoupon, { type: "warning" });
      return;
    }
    if (!cartBusinessId) return;
    setCouponLoading(true);
    try {
      const result = await userAppService.validateCoupon({
        code: couponCode.trim(),
        businessId: cartBusinessId,
        subTotal,
      });
      setAppliedCoupon({ code: result.code, discountAmount: result.discountAmount });
      toast.show(`${content.toasts.couponAppliedPrefix} ${result.discountAmount}`, { type: "success" });
    } catch (e: any) {
      setAppliedCoupon(null);
      toast.show(e?.message ?? content.toasts.invalidCoupon, { type: "danger" });
    } finally {
      setCouponLoading(false);
    }
  }, [cartBusinessId, couponCode, subTotal, toast]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
  }, []);

  const handlePlaceOrder = useCallback(() => {
    if (!selectedAddressId) {
      toast.show(content.toasts.selectAddress, { type: "warning" });
      return;
    }
    if (!cartBusinessId) {
      toast.show(content.toasts.cartEmpty, { type: "warning" });
      return;
    }
    const cartBusiness = businesses.find((b) => b.id === cartBusinessId);
    const businessStatus = cartBusiness ? getBusinessStatus(cartBusiness) : "open";
    if (businessStatus !== "open") {
      toast.show("This store is currently not accepting orders", { type: "warning" });
      return;
    }
    const storeMin = cartBusiness?.minimumOrderAmount;
    const minOrder = storeMin && storeMin > 0 ? storeMin : MINIMUM_ORDER;
    if (subTotal < minOrder) {
      toast.show(`${content.toasts.minOrderPrefix} ${minOrder}`, { type: "warning" });
      return;
    }

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.show(content.toasts.addressNotFound, { type: "danger" });
      return;
    }

    const paymentLabel =
      paymentMethod === "cash"
        ? content.payment.cash
        : paymentMethod === "card"
        ? content.payment.card
        : content.payment.upi;
    const timingLabel =
      paymentMethod === "cash" || paymentTiming === "atDelivery"
        ? content.payment.atDelivery
        : content.payment.atOrder;
    Alert.alert(
      content.confirm.title,
      `${content.confirm.totalPrefix} ${finalAmount}\n${content.confirm.paymentPrefix} ${paymentLabel} (${timingLabel})\n\n${content.confirm.question}`,
      [
        { text: content.confirm.cancel, style: "cancel" },
        {
          text: content.confirm.confirm,
          onPress: async () => {
            try {
              const addressPayload = {
                type: selectedAddress.type,
                name: selectedAddress.name,
                street: selectedAddress.street,
                landmark: selectedAddress.landmark,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                isDefault: selectedAddress.isDefault,
              };
              const itemsPayload = cartItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              }));

              if (paymentMethod === "cash") {
                // COD — direct order creation
                const effectiveTiming: PaymentTiming = "atDelivery";
                orderPlacedRef.current = true;
                await placeOrder({
                  businessId: cartBusinessId,
                  items: itemsPayload,
                  deliveryAddress: addressPayload,
                  paymentMethod,
                  paymentTiming: effectiveTiming,
                  couponCode: appliedCoupon?.code,
                });
                toast.show(content.toasts.orderPlaced, { type: "success", duration: 3000 });
                router.replace("/(user)/orders");
              } else {
                if (paymentMethod === "card") {
                  const cn = cardDetails.number.replace(/\s/g, "");
                  if (cn.length < 13 || !cardDetails.expiryMM || !cardDetails.expiryYY || cardDetails.cvv.length < 3) {
                    toast.show("Please fill in all card details", { type: "warning" });
                    return;
                  }
                }
                if (paymentMethod === "upi" && upiId.trim() && !upiId.includes("@")) {
                  toast.show("Enter a valid UPI ID (e.g. name@upi)", { type: "warning" });
                  return;
                }

                const paymentOrder = await paymentService.createPaymentOrder({
                  businessId: cartBusinessId,
                  items: itemsPayload,
                  deliveryAddress: addressPayload,
                  paymentMethod,
                  couponCode: appliedCoupon?.code,
                });

                await paymentService.startPayment(
                  paymentOrder.paymentSessionId,
                  paymentOrder.cfOrderId,
                  paymentMethod,
                  paymentMethod === "card" ? cardDetails : undefined,
                  paymentMethod === "upi" && upiId.trim() ? upiId.trim() : undefined,
                );

                // Verify payment with backend
                const verification = await paymentService.verifyPayment(paymentOrder.cfOrderId);
                if (verification.paymentStatus === "completed") {
                  orderPlacedRef.current = true;
                  toast.show(content.toasts.orderPlaced, { type: "success", duration: 3000 });
                  router.replace("/(user)/orders");
                } else {
                  toast.show("Payment is being processed. Check your orders.", { type: "warning" });
                  router.replace("/(user)/orders");
                }
              }
            } catch (err: any) {
              const message = err?.response?.data?.error ?? err?.message ?? content.toasts.orderFailed;
              toast.show(message, { type: "danger" });
            }
          },
        },
      ]
    );
  }, [addresses, appliedCoupon, businesses, cardDetails, cartBusinessId, cartItems, finalAmount, paymentMethod, paymentTiming, placeOrder, selectedAddressId, subTotal, toast, upiId]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/cart");
    }
  }, []);

  const addAddress = useCallback(() => router.push("/(user)/add-address"), []);

  return {
    cartItems,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    paymentMethod,
    setPaymentMethod: (method: PaymentMethod) => {
      setPaymentMethod(method);
      setPaymentTiming(method === "cash" ? "atDelivery" : "atOrder");
    },
    cardDetails,
    setCardDetails,
    upiId,
    setUpiId,
    loadingAddresses,
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponLoading,
    isLoading,
    subTotal,
    discountAmount,
    finalAmount,
    handleApplyCoupon,
    handleRemoveCoupon,
    handlePlaceOrder,
    goBack,
    addAddress,
    platformFee: PLATFORM_FEE,
    paymentGatewayFee,
  };
};
