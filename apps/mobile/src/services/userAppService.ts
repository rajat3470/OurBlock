import { apiClient } from "./apiClient";
import { Business, Order, Product, Society, PaginatedResponse } from "@/types";
import { UserAppStats } from "@store/slices/userAppSlice";

export const userAppService = {
  async getSocieties(
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Society>> {
    return apiClient.get<PaginatedResponse<Society>>(
      `/societies?page=${page}&limit=${limit}`
    );
  },

  async getBusinessesBySociety(societyId: string): Promise<Business[]> {
    return apiClient.get<Business[]>(`/businesses?societyId=${societyId}`);
  },

  async getFeaturedProducts(societyId: string): Promise<Product[]> {
    return apiClient.get<Product[]>(`/products/featured?societyId=${societyId}`);
  },

  async getMyOrders(page = 1, limit = 50): Promise<PaginatedResponse<Order>> {
    return apiClient.get<PaginatedResponse<Order>>(
      `/orders/my?page=${page}&limit=${limit}`
    );
  },

  async getStats(societyId?: string): Promise<UserAppStats> {
    const query = societyId ? `?societyId=${societyId}` : "";
    return apiClient.get<UserAppStats>(`/user/stats${query}`);
  },
};
