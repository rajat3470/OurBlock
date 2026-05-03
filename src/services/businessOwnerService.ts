import { apiClient } from "./apiClient";
import { Business, Order, Product, PaginatedResponse } from "@types/index";
import { BusinessOwnerStats } from "@store/slices/businessOwnerSlice";

export const businessOwnerService = {
  async getMyBusiness(): Promise<Business> {
    return apiClient.get<Business>("/owner/business");
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
    return apiClient.post<Product>("/owner/products", data);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.put<Product>(`/owner/products/${id}`, data);
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
    return apiClient.patch<Order>(`/owner/orders/${orderId}/status`, { status });
  },

  async getMyStats(): Promise<BusinessOwnerStats> {
    return apiClient.get<BusinessOwnerStats>("/owner/stats");
  },
};
