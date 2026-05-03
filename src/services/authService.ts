import { apiClient } from "./apiClient";
import {
  User,
  AuthResponse,
  AuthCredentials,
  SuperAdmin,
  BusinessOwner,
  AppUser,
} from "@types/index";

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

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout", {});
    await apiClient.clearTokens();
  },

  async refreshToken(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/refresh-token", {});
  },
};
