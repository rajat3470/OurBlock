import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";
import {
  AuthResponse,
  AuthCredentials,
  SuperAdmin,
  BusinessOwner,
  AppUser,
} from "@/types";

export const authService = {
  async loginSuperAdmin(
    credentials: AuthCredentials
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/superadmin/login", credentials);
  },

  async loginBusinessOwner(
    credentials: AuthCredentials
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(
      "/auth/businessowner/login",
      credentials
    );
  },

  async loginUser(credentials: AuthCredentials): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/user/login", credentials);
  },

  async loginDeliveryPartner(credentials: AuthCredentials): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/deliverypartner/login", credentials);
  },

  async registerSuperAdmin(data: Partial<SuperAdmin>): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/superadmin/register", data);
  },

  async registerBusinessOwner(
    data: Partial<BusinessOwner>
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(
      "/auth/businessowner/register",
      data
    );
  },

  async registerUser(data: Partial<AppUser>): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/user/register", data);
  },

  async verifyEmail(email: string, token: string): Promise<{ success: boolean }> {
    return apiClient.post("/auth/verify-email", { email, token });
  },

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    return apiClient.post("/auth/forgot-password", { email });
  },

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return apiClient.post("/auth/reset-password", { token, newPassword });
  },

  async changePassword(newPassword: string): Promise<{ success: boolean }> {
    return apiClient.post("/auth/change-password", { newPassword });
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout", {});
    } finally {
      await apiClient.clearTokens();
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const response = await apiClient.post<AuthResponse>("/auth/refresh-token", {
      refreshToken,
    });
    if (response?.tokens) {
      await apiClient.saveTokens(response.tokens);
    }
    return response;
  },

  async getCurrentUser(): Promise<{ success: boolean; data: AppUser }> {
    return apiClient.get<{ success: boolean; data: AppUser }>("/auth/me");
  },
};
