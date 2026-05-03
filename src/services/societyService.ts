import { apiClient } from "./apiClient";
import { Society, PaginatedResponse } from "@types/index";

export const societyService = {
  async getSocieties(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Society>> {
    return apiClient.get(
      `/societies?page=${page}&limit=${limit}`
    );
  },

  async getSocietyById(id: string): Promise<Society> {
    return apiClient.get(`/societies/${id}`);
  },

  async createSociety(data: Partial<Society>): Promise<Society> {
    return apiClient.post("/societies", data);
  },

  async updateSociety(id: string, data: Partial<Society>): Promise<Society> {
    return apiClient.put(`/societies/${id}`, data);
  },

  async deleteSociety(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/societies/${id}`);
  },

  async searchSocieties(query: string): Promise<Society[]> {
    return apiClient.get(`/societies/search?query=${query}`);
  },
};
