import { apiClient } from "./apiClient";
import { Society, Business, User, PaginatedResponse, HomeBanner } from "@/types";
import { SuperAdminStats } from "@store/slices/superAdminSlice";

export interface CreateBusinessOwnerPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  societyId: string;
}

export interface CreateBusinessOwnerResult {
  uid: string;
  email: string;
  temporaryPassword: string;
  message: string;
}

export interface BannerPayload {
  title: string;
  subtitle?: string;
  imageUrl: string;
  tagText?: string;
  ctaText?: string;
  ctaRoute?: string;
  societyId?: string;
  isActive?: boolean;
  sortOrder?: number;
  startAt?: string;
  endAt?: string;
}

export const superAdminService = {
  async getStats(): Promise<SuperAdminStats> {
    return apiClient.get<SuperAdminStats>("/admin/stats");
  },

  async getAllSocieties(
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Society>> {
    return apiClient.get<PaginatedResponse<Society>>(
      `/admin/societies?page=${page}&limit=${limit}`
    );
  },

  async createSociety(data: Partial<Society>): Promise<Society> {
    return apiClient.post<Society>("/admin/societies", data);
  },

  async updateSociety(id: string, data: Partial<Society>): Promise<Society> {
    return apiClient.put<Society>(`/admin/societies/${id}`, data);
  },

  async deleteSociety(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/admin/societies/${id}`);
  },

  async getAllBusinesses(
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Business>> {
    return apiClient.get<PaginatedResponse<Business>>(
      `/admin/businesses?page=${page}&limit=${limit}`
    );
  },

  async verifyBusiness(id: string): Promise<Business> {
    return apiClient.post<Business>(`/admin/businesses/${id}/verify`, {});
  },

  async rejectBusiness(id: string, reason?: string): Promise<Business> {
    return apiClient.post<Business>(`/admin/businesses/${id}/reject`, {
      reason,
    });
  },

  async suspendBusiness(id: string): Promise<Business> {
    return apiClient.put<Business>(`/businesses/${id}`, {
      managementSuspended: true,
      status: "suspended",
    });
  },

  async liftSuspensionBusiness(id: string): Promise<Business> {
    return apiClient.put<Business>(`/businesses/${id}`, {
      managementSuspended: false,
      status: "active",
    });
  },

  async revokeVerification(id: string): Promise<Business> {
    return apiClient.put<Business>(`/businesses/${id}`, {
      isVerified: false,
      status: "pending",
    });
  },

  async getAllUsers(page = 1, limit = 50): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>(
      `/admin/users?page=${page}&limit=${limit}`
    );
  },

  async suspendUser(id: string): Promise<User> {
    return apiClient.post<User>(`/admin/users/${id}/suspend`, {});
  },

  async activateUser(id: string): Promise<User> {
    return apiClient.post<User>(`/admin/users/${id}/activate`, {});
  },

  async createBusinessOwner(
    data: CreateBusinessOwnerPayload
  ): Promise<CreateBusinessOwnerResult> {
    return apiClient.post<CreateBusinessOwnerResult>(
      "/admin/business-owners",
      data
    );
  },

  async getBanners(societyId?: string): Promise<HomeBanner[]> {
    const query = societyId ? `?societyId=${societyId}` : "";
    const res = await apiClient.get<{ success: boolean; data: HomeBanner[] }>(`/admin/banners${query}`);
    return res.data;
  },

  async createBanner(data: BannerPayload): Promise<HomeBanner> {
    const res = await apiClient.post<{ success: boolean; data: HomeBanner }>("/admin/banners", data);
    return res.data;
  },

  async updateBanner(id: string, data: Partial<BannerPayload>): Promise<HomeBanner> {
    const res = await apiClient.put<{ success: boolean; data: HomeBanner }>(`/admin/banners/${id}`, data);
    return res.data;
  },

  async deleteBanner(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/admin/banners/${id}`);
  },
};
