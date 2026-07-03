import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthToken } from "@/types";

// Production API URL - deployed Firebase Functions
const BASE_URL = "https://us-central1-our-block-app.cloudfunctions.net/api";

class ApiClient {
  private axiosInstance: AxiosInstance;
  private baseURL: string = BASE_URL;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && error.config) {
          const originalConfig = error.config as AxiosRequestConfig & {
            _retry?: boolean;
            headers?: Record<string, string>;
            url?: string;
          };

          const isRefreshEndpoint = originalConfig.url?.includes("/auth/refresh-token");
          if (!originalConfig._retry && !isRefreshEndpoint) {
            originalConfig._retry = true;
            const accessToken = await this.refreshAccessToken();
            if (accessToken) {
              originalConfig.headers = {
                ...(originalConfig.headers ?? {}),
                Authorization: `Bearer ${accessToken}`,
              };
              return this.axiosInstance(originalConfig);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const refreshToken = await AsyncStorage.getItem("refreshToken");
          // Skip refresh for mock tokens — they never expire
          if (!refreshToken || refreshToken.startsWith("mock-")) {
            return null;
          }

          const response = await axios.post(`${this.baseURL}/auth/refresh-token`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.setItem("accessToken", accessToken);
          await AsyncStorage.setItem("refreshToken", newRefreshToken);
          return accessToken;
        } catch (err) {
          console.warn("[apiClient] Token refresh failed:", err);
          await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
          return null;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    return this.refreshPromise;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(
      url,
      config
    );
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(
      url,
      data,
      config
    );
    return response.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(
      url,
      data,
      config
    );
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(
      url,
      data,
      config
    );
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(
      url,
      config
    );
    return response.data;
  }

  async saveTokens(tokens: AuthToken): Promise<void> {
    await AsyncStorage.multiSet([
      ["accessToken", tokens.accessToken],
      ["refreshToken", tokens.refreshToken],
    ]);
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
  }
}

export const apiClient = new ApiClient();
