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
    const res = await apiClient.get<any>(`/societies?page=${page}&limit=${limit}`);
    const data = Array.isArray(res?.data) ? res.data : [];
    const total = Number(res?.pagination?.total ?? data.length);
    return {
      data,
      pagination: {
        page: Number(res?.pagination?.page ?? page),
        limit: Number(res?.pagination?.limit ?? limit),
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
      },
    };
  },

  async getBusinessesBySociety(societyId: string): Promise<Business[]> {
    const res = await apiClient.get<any>(`/businesses?societyId=${societyId}`);
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async getFeaturedProducts(societyId: string): Promise<Product[]> {
    const res = await apiClient.get<any>(`/products/featured?societyId=${societyId}`);
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async getProductById(productId: string): Promise<Product> {
    const res = await apiClient.get<{ success: boolean; data: Product }>(`/products/${productId}`);
    return res.data;
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
    const res = await apiClient.get<any>(`/auth/home-feed?societyId=${societyId}`);
    const payload = (res?.data && typeof res.data === "object") ? res.data : res;

    return {
      societyId: String(payload?.societyId ?? societyId),
      stats: payload?.stats ?? { totalBusinesses: 0, activeOrders: 0, favoriteCount: 0 },
      categories: Array.isArray(payload?.categories) ? payload.categories : [],
      businesses: Array.isArray(payload?.businesses) ? payload.businesses : [],
      featuredProducts: Array.isArray(payload?.featuredProducts) ? payload.featuredProducts : [],
      topRatedBusinesses: Array.isArray(payload?.topRatedBusinesses) ? payload.topRatedBusinesses : [],
      offerProducts: Array.isArray(payload?.offerProducts) ? payload.offerProducts : [],
      banners: Array.isArray(payload?.banners) ? payload.banners : [],
    };
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

  // Coupons
  async validateCoupon(payload: {
    code: string;
    businessId: string;
    subTotal: number;
  }): Promise<{ code: string; discountAmount: number; finalTotal: number }> {
    const res = await apiClient.post<{ success: boolean; data: { code: string; discountAmount: number; finalTotal: number } }>(
      "/coupons/validate",
      payload
    );
    return (res as any).data ?? res;
  },

  async getActiveCoupons(): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/coupons");
    return (res as any).data ?? [];
  },

  // Refunds
  async submitRefund(payload: {
    orderId: string;
    reason: string;
    comment: string;
  }): Promise<{ id: string }> {
    const res = await apiClient.post<{ success: boolean; data: { id: string } }>("/refunds", payload);
    return (res as any).data ?? res;
  },

  async getMyRefunds(): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/refunds/my");
    return (res as any).data ?? [];
  },

  // Reviews
  async submitReview(payload: {
    orderId: string;
    businessId?: string;
    productId?: string;
    rating: number;
    title?: string;
    comment: string;
    imageUrls?: string[];
  }): Promise<{ id: string }> {
    const res = await apiClient.post<{ success: boolean; data: { id: string } }>("/reviews", payload);
    return (res as any).data ?? res;
  },

  async getBusinessReviews(businessId: string): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(`/reviews?businessId=${businessId}`);
    return (res as any).data ?? [];
  },

  async claimAdReward(): Promise<{ couponCode: string; discountAmount: number; expiresAt: string }> {
    const res = await apiClient.post<{ success: boolean; couponCode: string; discountAmount: number; expiresAt: string }>(
      "/ads/claim-reward",
      {}
    );
    return { couponCode: res.couponCode, discountAmount: res.discountAmount, expiresAt: res.expiresAt };
  },
};
