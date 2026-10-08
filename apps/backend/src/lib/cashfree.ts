import crypto from "crypto";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";

const BASE_URL =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const API_VERSION = "2023-08-01";

function headers() {
  return {
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET_KEY,
    "x-api-version": API_VERSION,
    "Content-Type": "application/json",
  };
}

export interface CashfreeOrderRequest {
  orderId: string;
  orderAmount: number;
  customerPhone: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
}

export async function createCashfreeOrder(
  req: CashfreeOrderRequest
): Promise<CashfreeOrderResponse> {
  console.log("[Cashfree] Creating order with env:", CASHFREE_ENV, "| APP_ID starts with:", CASHFREE_APP_ID?.slice(0, 10) + "...");

  const customerDetails: Record<string, string> = {
    customer_id: req.customerId,
    customer_phone: req.customerPhone,
  };
  if (req.customerEmail) customerDetails.customer_email = req.customerEmail;
  if (req.customerName) customerDetails.customer_name = req.customerName;

  const body: Record<string, any> = {
    order_id: req.orderId,
    order_amount: Number(req.orderAmount.toFixed(2)),
    order_currency: "INR",
    customer_details: customerDetails,
  };
  if (req.returnUrl || req.notifyUrl) {
    const meta: Record<string, string> = {};
    if (req.returnUrl) meta.return_url = req.returnUrl;
    if (req.notifyUrl) meta.notify_url = req.notifyUrl;
    body.order_meta = meta;
  }

  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    console.error("[Cashfree] Create order FAILED:", res.status, JSON.stringify(data));
    throw new Error(data.message || `Cashfree create order failed: ${res.status}`);
  }
  console.log("[Cashfree] Order created successfully, session_id:", data.payment_session_id?.slice(0, 20) + "...");
  if (!data.payment_session_id) {
    console.error("Cashfree returned no payment_session_id:", JSON.stringify(data));
    throw new Error("Cashfree order created but no payment_session_id returned");
  }
  return data as CashfreeOrderResponse;
}

export async function getCashfreeOrderStatus(orderId: string): Promise<{
  order_status: string;
  cf_order_id: string;
  order_amount: number;
}> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: "GET",
    headers: headers(),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.message || `Cashfree get order failed: ${res.status}`);
  }
  return data;
}

export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const payload = timestamp + rawBody;
  const expected = crypto
    .createHmac("sha256", CASHFREE_SECRET_KEY)
    .update(payload)
    .digest("base64");
  return expected === signature;
}
