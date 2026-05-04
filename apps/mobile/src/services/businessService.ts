import { apiClient } from "./apiClient";
import { Business, BusinessCategory, PaginatedResponse } from "@types/index";

export const businessService = {
  async getBusinesses(
    societyId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Business>> {
    return apiClient.get(
      `/businesses?societyId=${societyId}&page=${page}&limit=${limit}`
    );
  },

  async getBusinessById(id: string): Promise<Business> {
    return apiClient.get(`/businesses/${id}`);
  },

  async getBusinessesByCategory(
    category: BusinessCategory,
    societyId: string
  ): Promise<Business[]> {
    return apiClient.get(
      `/businesses/category/${category}?societyId=${societyId}`
    );
  },

  async createBusiness(data: Partial<Business>): Promise<Business> {
    return apiClient.post("/businesses", data);
  },

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    return apiClient.put(`/businesses/${id}`, data);
  },

  async deleteBusiness(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/businesses/${id}`);
  },

  async searchBusinesses(query: string, societyId: string): Promise<Business[]> {
    return apiClient.get(
      `/businesses/search?query=${query}&societyId=${societyId}`
    );
  },

  async getBusinessesByOwner(ownerId: string): Promise<Business[]> {
    return apiClient.get(`/businesses/owner/${ownerId}`);
  },

  async verifyBusiness(id: string): Promise<Business> {
    return apiClient.post(`/businesses/${id}/verify`, {});
  },
};
