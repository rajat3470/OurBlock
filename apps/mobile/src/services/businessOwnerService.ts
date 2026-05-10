import { apiClient } from "./apiClient";
import { Business, Order, Product, PaginatedResponse } from "@/types";
import { BusinessOwnerStats } from "@store/slices/businessOwnerSlice";

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
    return apiClient.get<PaginatedResponse<Order>>(
      `/owner/orders?page=${page}&limit=${limit}`
    );
  },

  async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<Order> {
    const res = await apiClient.patch<ApiEnvelope<Order>>(`/owner/orders/${orderId}/status`, { status });
    return res.data;
  },

  async getMyStats(): Promise<BusinessOwnerStats> {
    const res = await apiClient.get<ApiEnvelope<BusinessOwnerStats>>("/owner/stats");
    return res.data;
  },
};
