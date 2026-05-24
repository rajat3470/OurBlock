import { apiClient } from "./apiClient";
import { Business, CreateOrderPayload, Order, Product, Society, PaginatedResponse, Address, AppUser, HomeBanner } from "@/types";
import { UserAppStats } from "@store/slices/userAppSlice";

export interface HomeFeedCategory {
  key: string;
  count: number;
}

export interface HomeFeedResponse {
  societyId: string;
  stats: UserAppStats;
  categories: HomeFeedCategory[];
  businesses: Business[];
  featuredProducts: Product[];
  topRatedBusinesses: Business[];
  offerProducts: Product[];
  banners: HomeBanner[];
}

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

  async getProductsByBusiness(businessId: string): Promise<Product[]> {
    const res = await apiClient.get<{ success: boolean; data: Product[] }>(`/products?businessId=${businessId}`);
    return res.data ?? [];
  },

  async getMyOrders(page = 1, limit = 50): Promise<PaginatedResponse<Order>> {
    const res = await apiClient.get<{ success: boolean; data: Order[]; total: number }>(
      `/orders/my?page=${page}&limit=${limit}`
    );
    const total = res.total ?? res.data.length;
    return {
      data: res.data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getOrder(id: string): Promise<Order> {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return apiClient.post<Order>("/orders", payload);
  },

  async cancelOrder(id: string): Promise<Order> {
    return apiClient.put<Order>(`/orders/${id}/status`, { status: "cancelled" });
  },

  async getStats(societyId?: string): Promise<UserAppStats> {
    const query = societyId ? `?societyId=${societyId}` : "";
    return apiClient.get<UserAppStats>(`/user/stats${query}`);
  },

  async getHomeFeed(societyId: string): Promise<HomeFeedResponse> {
    return apiClient.get<HomeFeedResponse>(`/auth/home-feed?societyId=${societyId}`);
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
