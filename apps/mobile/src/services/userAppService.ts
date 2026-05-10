import { apiClient } from "./apiClient";
import { Business, Order, Product, Society, PaginatedResponse, Address, AppUser } from "@/types";
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

  // Profile Management
  async updateProfile(data: Partial<AppUser>): Promise<AppUser> {
    return apiClient.put<AppUser>("/auth/profile/me", data);
  },

  async getProfile(): Promise<AppUser> {
    return apiClient.get<AppUser>("/auth/profile/me");
  },

  // Address Management
  async getAddresses(): Promise<Address[]> {
    return apiClient.get<Address[]>("/auth/addresses/me");
  },

  async addAddress(data: Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Address> {
    return apiClient.post<Address>("/auth/addresses/me", data);
  },

  async updateAddress(id: string, data: Partial<Address>): Promise<Address> {
    return apiClient.put<Address>(`/auth/addresses/${id}`, data);
  },

  async deleteAddress(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/auth/addresses/${id}`);
  },

  async setDefaultAddress(id: string): Promise<Address> {
    return apiClient.put<Address>(`/auth/addresses/${id}/set-default`, {});
  },

  // Phone Verification
  async verifyPhone(code: string, verificationId: string): Promise<{ success: boolean }> {
    return apiClient.post("/auth/verify-phone", { code, verificationId });
  },
};
