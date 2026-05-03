import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthToken, ApiError } from "@types/index";

const BASE_URL = "https://api.ourblock.com/v1"; // Replace with your backend URL

class ApiClient {
  private axiosInstance: AxiosInstance;
  private baseURL: string = BASE_URL;

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
        if (error.response?.status === 401) {
          // Token expired, attempt refresh
          try {
            const refreshToken = await AsyncStorage.getItem("refreshToken");
            if (refreshToken) {
              // Call refresh endpoint
              const response = await axios.post(
                `${this.baseURL}/auth/refresh`,
                { refreshToken }
              );
              const { accessToken, refreshToken: newRefreshToken } =
                response.data;
              await AsyncStorage.setItem("accessToken", accessToken);
              await AsyncStorage.setItem("refreshToken", newRefreshToken);

              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${accessToken}`;
                return this.axiosInstance(error.config);
              }
            }
          } catch (err) {
            // Refresh failed, logout user
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
            // Dispatch logout action
          }
        }
        return Promise.reject(error);
      }
    );
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
