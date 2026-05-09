import { apiClient } from "./apiClient";
import { Society, Business, User, PaginatedResponse } from "@/types";
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
};
