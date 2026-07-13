import { apiClient } from "./apiClient";
import { CompleteDeliveryPayload, Order } from "@/types";

type ApiEnvelope<T> = { success: boolean; data: T; error?: string };

export type DeliveryBusiness = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  imageUrl?: string | null;
  category?: string | null;
};

export type DeliveryOrdersResponse = {
  success: boolean;
  data: Order[];
  business?: DeliveryBusiness | null;
  meta?: { actionableCount: number; total: number };
};

/** In-memory cache for the delivery queue (shared across screens). */
const QUEUE_CACHE_TTL_MS = 45_000;
let queueCache: DeliveryOrdersResponse | null = null;
let queueCacheAt = 0;

export function getCachedDeliveryQueue(): DeliveryOrdersResponse | null {
  if (queueCache && Date.now() - queueCacheAt < QUEUE_CACHE_TTL_MS) return queueCache;
  return null;
}

export function setCachedDeliveryQueue(payload: DeliveryOrdersResponse) {
  queueCache = payload;
  queueCacheAt = Date.now();
}

export function invalidateDeliveryQueueCache() {
  queueCache = null;
  queueCacheAt = 0;
}

export const deliveryPartnerService = {
  async getPendingOrders(): Promise<DeliveryOrdersResponse> {
    const res = await apiClient.get<DeliveryOrdersResponse>("/delivery/orders");
    setCachedDeliveryQueue(res);
    return res;
  },

  async getMe(): Promise<{
    success: boolean;
    data: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      businessId?: string;
      business?: DeliveryBusiness | null;
    };
  }> {
    return apiClient.get("/delivery/me");
  },

  async getOrder(orderId: string): Promise<Order> {
    const res = await apiClient.get<ApiEnvelope<Order>>(`/delivery/orders/${orderId}`);
    return res.data;
  },

  async startDelivery(orderId: string): Promise<Order> {
    const res = await apiClient.post<ApiEnvelope<Order>>(
      `/delivery/orders/${orderId}/start`,
      {}
    );
    return res.data;
  },

  async completeDelivery(
    orderId: string,
    payload: CompleteDeliveryPayload
  ): Promise<Order> {
    const res = await apiClient.post<ApiEnvelope<Order>>(
      `/delivery/orders/${orderId}/complete`,
      payload
    );
    return res.data;
  },
};
