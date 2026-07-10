import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useAppSelector } from "@hooks/useRedux";
import { useUserApp } from "@hooks/useUserApp";
import { userAppService } from "@services/userAppService";
import { Address } from "@/types";
import { ORDER_FEES } from "@/constants";
import content from "@/content/checkout.json";

const { PLATFORM_FEE, MINIMUM_ORDER } = ORDER_FEES;

export const PAYMENT_METHODS = [
  { key: "cash" as const, icon: "💵" },
  { key: "upi" as const, icon: "📱" },
];

export type PaymentMethod = "cash" | "upi";

/**
 * Encapsulates the checkout flow: address loading, coupon validation,
 * payment method selection, and order placement.
 */
export const useCheckout = () => {
  const toast = useToast();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const { placeOrder, isLoading, businesses } = useUserApp();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const orderPlacedRef = useRef(false);

  const subTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const finalAmount = subTotal + PLATFORM_FEE - discountAmount;

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
    const storeMin = businesses.find((b) => b.id === cartBusinessId)?.minimumOrderAmount;
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

    const paymentLabel = paymentMethod === "cash" ? content.payment.cash : content.payment.upi;
    Alert.alert(
      content.confirm.title,
      `${content.confirm.totalPrefix} ${finalAmount}\n${content.confirm.paymentPrefix} ${paymentLabel}\n\n${content.confirm.question}`,
      [
        { text: content.confirm.cancel, style: "cancel" },
        {
          text: content.confirm.confirm,
          onPress: async () => {
            try {
              const payload = {
                businessId: cartBusinessId,
                items: cartItems.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                })),
                deliveryAddress: {
                  type: selectedAddress.type,
                  name: selectedAddress.name,
                  street: selectedAddress.street,
                  landmark: selectedAddress.landmark,
                  city: selectedAddress.city,
                  state: selectedAddress.state,
                  pincode: selectedAddress.pincode,
                  phone: selectedAddress.phone,
                  isDefault: selectedAddress.isDefault,
                },
                paymentMethod,
                couponCode: appliedCoupon?.code,
              };
              orderPlacedRef.current = true;
              await placeOrder(payload);
              toast.show(content.toasts.orderPlaced, { type: "success", duration: 3000 });
              router.replace("/(user)/orders");
            } catch (err: any) {
              const message = err?.response?.data?.error ?? err?.message ?? content.toasts.orderFailed;
              toast.show(message, { type: "danger" });
            }
          },
        },
      ]
    );
  }, [addresses, appliedCoupon, businesses, cartBusinessId, cartItems, finalAmount, paymentMethod, placeOrder, selectedAddressId, subTotal, toast]);

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
    setPaymentMethod,
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
  };
};
