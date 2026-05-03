import { useState } from "react";
import { authService } from "@services/authService";
import { useAppDispatch } from "./useRedux";
import { setAuth, setError, logout, setLoading } from "@store/slices/authSlice";
import { apiClient } from "@services/apiClient";
import { AuthCredentials, User } from "@types/index";

export const useAuth = () => {
  const dispatch = useAppDispatch();

  const login = async (
    credentials: AuthCredentials,
    role: "superAdmin" | "businessOwner" | "user"
  ) => {
    dispatch(setLoading(true));
    try {
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
    dispatch(setLoading(true));
    try {
      await authService.logout();
      dispatch(logout());
    } catch (error: any) {
      dispatch(setError("Logout failed"));
      throw error;
    } finally {
      dispatch(setLoading(false));
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

  return {
    login,
    register,
    logoutUser,
    resetPassword,
  };
};
