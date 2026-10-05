import { NativeModules } from "react-native";
import { apiClient } from "./apiClient";

interface CreatePaymentOrderPayload {
  businessId: string;
  items: { productId: string; quantity: number; price: number }[];
  deliveryAddress: Record<string, any>;
  paymentMethod: "upi" | "card";
  couponCode?: string;
  notes?: string;
}

interface CreatePaymentOrderResponse {
  orderId: string;
  cfOrderId: string;
  paymentSessionId: string;
  environment: "sandbox" | "production";
}

interface VerifyPaymentResponse {
  success: boolean;
  data?: any;
  paymentStatus: "completed" | "failed" | "active";
  error?: string;
}

export interface CardDetails {
  holderName: string;
  number: string;
  expiryMM: string;
  expiryYY: string;
  cvv: string;
}

function loadCashfreeSDK() {
  if (!NativeModules.CashfreePgApi && !NativeModules.CashfreeEventEmitter) {
    return null;
  }
  try {
    const sdk = require("react-native-cashfree-pg-sdk");
    const contract = require("cashfree-pg-api-contract");
    return { sdk, contract };
  } catch {
    return null;
  }
}

export const paymentService = {
  async createPaymentOrder(payload: CreatePaymentOrderPayload): Promise<CreatePaymentOrderResponse> {
    const res = await apiClient.post<{ success: boolean; data: CreatePaymentOrderResponse }>("/payments/create-order", payload);
    if (!(res as any).success) throw new Error((res as any).error || "Failed to create payment order");
    return (res as any).data;
  },

  async verifyPayment(cfOrderId: string): Promise<VerifyPaymentResponse> {
    const res = await apiClient.post<VerifyPaymentResponse>("/payments/verify", { cfOrderId });
    return res;
  },

  async startPayment(
    paymentSessionId: string,
    cfOrderId: string,
    method?: "upi" | "card",
    cardDetails?: CardDetails,
    upiId?: string,
    environment?: "sandbox" | "production",
  ): Promise<boolean> {
    const modules = loadCashfreeSDK();
    if (!modules) throw new Error("Payment SDK not available. Please use a development build (not Expo Go) to test payments.");

    const { CFPaymentGatewayService } = modules.sdk;
    const {
      CFEnvironment, CFSession, CFThemeBuilder,
      CFUPIIntentCheckoutPayment,
      ElementCard, CFCardPayment,
      CFUPI, CFUPIPayment, UPIMode,
    } = modules.contract;

    const env = environment === "production"
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX;
    const session = new CFSession(paymentSessionId, cfOrderId, env);

    const theme = new CFThemeBuilder()
      .setNavigationBarBackgroundColor("#084C3D")
      .setNavigationBarTextColor("#FFFFFF")
      .setButtonBackgroundColor("#084C3D")
      .setButtonTextColor("#FFFFFF")
      .setBackgroundColor("#FFFFFF")
      .setPrimaryTextColor("#212121")
      .setSecondaryTextColor("#757575")
      .build();

    return new Promise((resolve, reject) => {
      CFPaymentGatewayService.setCallback({
        onVerify(_orderID: string) {
          resolve(true);
        },
        onError(error: any, _orderID: string) {
          const msg = error?.getMessage?.() ?? error?.message ?? "Payment failed";
          reject(new Error(msg));
        },
      });

      if (method === "card" && cardDetails) {
        const card = new ElementCard(
          cardDetails.holderName,
          cardDetails.expiryMM,
          cardDetails.expiryYY,
          cardDetails.cvv,
          false,
        );
        card.cardNumber = cardDetails.number.replace(/\s/g, "");
        const cardPayment = new CFCardPayment(session, card);
        CFPaymentGatewayService.doCardPayment(cardPayment);
      } else if (method === "upi" && upiId) {
        const upi = new CFUPI(UPIMode.COLLECT, upiId);
        const upiPayment = new CFUPIPayment(session, upi);
        CFPaymentGatewayService.doUPIPayment(upiPayment);
      } else {
        const upiPayment = new CFUPIIntentCheckoutPayment(session, theme);
        CFPaymentGatewayService.doUPIPayment(upiPayment);
      }
    });
  },
};
