import { apiClient } from "./apiClient";
import { Product, PaginatedResponse } from "@types/index";

export const productService = {
  async getProducts(
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Product>> {
    return apiClient.get(
      `/products?businessId=${businessId}&page=${page}&limit=${limit}`
    );
  },

  async getProductById(id: string): Promise<Product> {
    return apiClient.get(`/products/${id}`);
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    return apiClient.post("/products", data);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.put(`/products/${id}`, data);
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/products/${id}`);
  },

  async searchProducts(query: string, businessId?: string): Promise<Product[]> {
    const url = businessId
      ? `/products/search?query=${query}&businessId=${businessId}`
      : `/products/search?query=${query}`;
    return apiClient.get(url);
  },

  async getProductsByBusiness(businessId: string): Promise<Product[]> {
    return apiClient.get(`/products/business/${businessId}`);
  },

  async getProductsByCategory(
    businessId: string,
    category: string
  ): Promise<Product[]> {
    return apiClient.get(
      `/products?businessId=${businessId}&category=${category}`
    );
  },
};
