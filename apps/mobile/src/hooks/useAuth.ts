import { useState } from "react";
import { authService } from "@services/authService";
import { useAppDispatch } from "./useRedux";
import { setAuth, setError, logout, setLoading } from "@store/slices/authSlice";
import { apiClient } from "@services/apiClient";
import { AuthCredentials, AuthResponse, User } from "@types/index";

// ---------------------------------------------------------------------------
// Mock credentials — used while the backend is not yet available.
// Remove this block (and the mockLogin call below) once the real API is ready.
// ---------------------------------------------------------------------------
const MOCK_USERS: Record<string, AuthResponse> = {
  "admin@ourblock.com": {
    user: {
      id: "mock-super-admin-1",
      firstName: "Super",
      lastName: "Admin",
      email: "admin@ourblock.com",
      phone: "9000000001",
      role: "superAdmin",
      isEmailVerified: true,
      isPhoneVerified: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tokens: {
      accessToken: "mock-access-token-superadmin",
      refreshToken: "mock-refresh-token-superadmin",
      expiresIn: 900,
    },
  },
  "business@ourblock.com": {
    user: {
      id: "mock-business-owner-1",
      firstName: "Business",
      lastName: "Owner",
      email: "business@ourblock.com",
      phone: "9000000002",
      role: "businessOwner",
      societyId: "mock-society-1",
      isEmailVerified: true,
      isPhoneVerified: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tokens: {
      accessToken: "mock-access-token-businessowner",
      refreshToken: "mock-refresh-token-businessowner",
      expiresIn: 900,
    },
  },
  "user@ourblock.com": {
    user: {
      id: "mock-user-1",
      firstName: "Test",
      lastName: "User",
      email: "user@ourblock.com",
      phone: "9000000003",
      role: "user",
      societyId: "mock-society-1",
      isEmailVerified: true,
      isPhoneVerified: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tokens: {
      accessToken: "mock-access-token-user",
      refreshToken: "mock-refresh-token-user",
      expiresIn: 900,
    },
  },
};

const MOCK_PASSWORD = "Test@1234";

function mockLogin(
  credentials: AuthCredentials,
  role: "superAdmin" | "businessOwner" | "user"
): AuthResponse | null {
  const mockUser = MOCK_USERS[credentials.email.toLowerCase()];
  if (mockUser && credentials.password === MOCK_PASSWORD && mockUser.user.role === role) {
    return mockUser;
  }
  return null;
}
// ---------------------------------------------------------------------------

export const useAuth = () => {
  const dispatch = useAppDispatch();

  const login = async (
    credentials: AuthCredentials,
    role: "superAdmin" | "businessOwner" | "user"
  ) => {
    dispatch(setLoading(true));
    try {
      // Try mock login first (remove once real backend is ready)
      const mock = mockLogin(credentials, role);
      if (mock) {
        await apiClient.saveTokens(mock.tokens);
        dispatch(setAuth(mock));
        return;
      }

      let response;
      switch (role) {
        case "superAdmin":
          response = await authService.loginSuperAdmin(credentials);
          break;
        case "businessOwner":
          response = await authService.loginBusinessOwner(credentials);
          break;
        case "user":
          response = await authService.loginUser(credentials);
          break;
      }

      if (response) {
        await apiClient.saveTokens(response.tokens);
        dispatch(setAuth(response));
      }
    } catch (error: any) {
      dispatch(
        setError(
          error.response?.data?.message || "Login failed. Please try again."
        )
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const register = async (data: any, role: "superAdmin" | "businessOwner" | "user") => {
    dispatch(setLoading(true));
    try {
      let response;
      switch (role) {
        case "superAdmin":
          response = await authService.registerSuperAdmin(data);
          break;
        case "businessOwner":
          response = await authService.registerBusinessOwner(data);
          break;
        case "user":
          response = await authService.registerUser(data);
          break;
      }

      if (response) {
        await apiClient.saveTokens(response.tokens);
        dispatch(setAuth(response));
      }
    } catch (error: any) {
      dispatch(
        setError(
          error.response?.data?.message || "Registration failed. Please try again."
        )
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logoutUser = async () => {
    // Clear local state and tokens immediately so the UI reflects logout at once.
    // The API call is best-effort — a network/backend failure should never block logout.
    dispatch(logout());
    await apiClient.clearTokens();
    try {
      await authService.logout();
    } catch {
      // Ignore — server-side session invalidation is non-critical
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    dispatch(setLoading(true));
    try {
      await authService.resetPassword(token, newPassword);
    } catch (error: any) {
      dispatch(
        setError(
          error.response?.data?.message || "Password reset failed."
        )
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const changePassword = async (newPassword: string) => {
    dispatch(setLoading(true));
    try {
      await authService.changePassword(newPassword);
    } catch (error: any) {
      dispatch(
        setError(
          error.response?.data?.message || "Failed to change password."
        )
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  return {
    login,
    register,
    logoutUser,
    resetPassword,
    changePassword,
  };
};
