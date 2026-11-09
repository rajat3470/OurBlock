import { apiClient } from "./apiClient";
import { Society, PaginatedResponse } from "@/types";

export interface AreaInfo {
  city: string;
  state: string;
  societyCount: number;
}

export const societyService = {
  async getAreas(): Promise<{ success: boolean; data: AreaInfo[] }> {
    return apiClient.get("/societies/areas");
  },

  async getSocieties(
    page: number = 1,
    limit: number = 10,
    city?: string
  ): Promise<PaginatedResponse<Society>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (city) params.set("city", city);
    return apiClient.get(`/societies?${params.toString()}`);
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
