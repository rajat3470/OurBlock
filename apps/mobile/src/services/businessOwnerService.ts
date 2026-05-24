import { apiClient } from "./apiClient";
import { Business, Order, Product, PaginatedResponse } from "@/types";
import { BusinessOwnerStats, BusinessAnalytics } from "@store/slices/businessOwnerSlice";

// All API responses are wrapped in { success, data }. This helper unwraps them.
type ApiEnvelope<T> = { success: boolean; data: T; error?: string };

export const businessOwnerService = {
  async getMyBusiness(): Promise<Business> {
    const res = await apiClient.get<ApiEnvelope<Business>>("/owner/business");
    return res.data;
  },

  async getMyProducts(
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Product>> {
    return apiClient.get<PaginatedResponse<Product>>(
      `/owner/products?page=${page}&limit=${limit}`
    );
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await apiClient.post<ApiEnvelope<Product>>("/owner/products", data);
    return res.data;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await apiClient.put<ApiEnvelope<Product>>(`/owner/products/${id}`, data);
    return res.data;
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/owner/products/${id}`);
  },

  async getMyOrders(
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Order>> {
    const res = await apiClient.get<{ success: boolean; data: Order[]; total: number }>(
      `/orders/business?page=${page}&limit=${limit}`
    );
    const total = res.total ?? res.data.length;
    return {
      data: res.data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<Order> {
    const res = await apiClient.put<{ success: boolean; data: Order }>(`/orders/${orderId}/status`, { status });
    return res.data;
  },

  async rejectOrder(orderId: string, reason: string): Promise<Order> {
    const res = await apiClient.post<{ success: boolean; data: Order }>(
      `/owner/orders/${orderId}/reject`,
      { reason }
    );
    return res.data;
  },

  async getMyStats(): Promise<BusinessOwnerStats> {
    const res = await apiClient.get<ApiEnvelope<BusinessOwnerStats>>("/owner/stats");
    return res.data;
  },

  async toggleTakingOrders(isTakingOrders: boolean): Promise<{ isTakingOrders: boolean }> {
    const res = await apiClient.patch<ApiEnvelope<{ isTakingOrders: boolean }>>("/owner/business/taking-orders", { isTakingOrders });
    return res.data;
  },

  async updateBusinessSettings(data: {
    minimumOrderAmount?: number;
    estimatedDeliveryTime?: string;
    preparationTime?: string;
    deliveryFee?: number;
    tags?: string[];
  }): Promise<Business> {
    const res = await apiClient.patch<ApiEnvelope<Business>>("/owner/business/settings", data);
    return res.data;
  },

  async getAnalytics(): Promise<BusinessAnalytics> {
    const res = await apiClient.get<ApiEnvelope<BusinessAnalytics>>("/owner/analytics");
    return res.data;
  },

  async createCoupon(data: {
    code: string;
    type: "percentage" | "flat";
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    expiresAt?: string;
    usageLimit?: number;
    description?: string;
  }): Promise<any> {
    const res = await apiClient.post<ApiEnvelope<any>>("/owner/coupons", data);
    return res.data;
  },

  async getMyCoupons(): Promise<any[]> {
    const res = await apiClient.get<ApiEnvelope<any[]>>("/owner/coupons");
    return res.data ?? [];
  },

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete<any>(`/owner/coupons/${id}`);
  },
};
