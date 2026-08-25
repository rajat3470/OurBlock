import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthToken } from "@/types";

// Backend API base URL
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5001";

/** Refresh a few minutes before the access token actually expires. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;
const TOKEN_EXPIRES_AT_KEY = "tokenExpiresAt";

type SessionExpiredListener = () => void;
type TokensUpdatedListener = (tokens: AuthToken) => void;

class ApiClient {
  private axiosInstance: AxiosInstance;
  private baseURL: string = BASE_URL;
  private refreshPromise: Promise<string | null> | null = null;
  private sessionExpiredListeners = new Set<SessionExpiredListener>();
  private tokensUpdatedListeners = new Set<TokensUpdatedListener>();

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
        // Proactively refresh before attaching an about-to-expire token.
        const token = await this.ensureValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor — recover from expired access tokens via refresh.
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
          const isLogoutEndpoint = originalConfig.url?.includes("/auth/logout");
          if (!originalConfig._retry && !isRefreshEndpoint && !isLogoutEndpoint) {
            originalConfig._retry = true;
            const accessToken = await this.refreshAccessToken({ force: true });
            if (accessToken) {
              const headers = (originalConfig.headers ?? {}) as Record<string, string>;
              headers.Authorization = `Bearer ${accessToken}`;
              originalConfig.headers = headers;
              return this.axiosInstance(originalConfig);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /** Subscribe to hard session expiry (refresh token invalid / revoked). */
  onSessionExpired(listener: SessionExpiredListener): () => void {
    this.sessionExpiredListeners.add(listener);
    return () => this.sessionExpiredListeners.delete(listener);
  }

  /** Subscribe to successful token rotations so Redux/storage stay in sync. */
  onTokensUpdated(listener: TokensUpdatedListener): () => void {
    this.tokensUpdatedListeners.add(listener);
    return () => this.tokensUpdatedListeners.delete(listener);
  }

  private notifySessionExpired(): void {
    this.sessionExpiredListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Listeners must not break the refresh flow.
      }
    });
  }

  private notifyTokensUpdated(tokens: AuthToken): void {
    this.tokensUpdatedListeners.forEach((listener) => {
      try {
        listener(tokens);
      } catch {
        // Listeners must not break the refresh flow.
      }
    });
  }

  private extractTokens(payload: any): AuthToken | null {
    const nested = payload?.tokens;
    const accessToken =
      nested?.accessToken ?? payload?.accessToken ?? payload?.id_token ?? null;
    const refreshToken =
      nested?.refreshToken ?? payload?.refreshToken ?? payload?.refresh_token ?? null;
    const expiresInRaw =
      nested?.expiresIn ?? payload?.expiresIn ?? payload?.expires_in ?? 3600;
    const expiresIn = Number.parseInt(String(expiresInRaw), 10);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
    };
  }

  private async isAccessTokenExpiringSoon(): Promise<boolean> {
    const expiresAtRaw = await AsyncStorage.getItem(TOKEN_EXPIRES_AT_KEY);
    if (!expiresAtRaw) {
      // Legacy sessions without expiry metadata — refresh once to establish it.
      return true;
    }
    const expiresAt = Number.parseInt(expiresAtRaw, 10);
    if (!Number.isFinite(expiresAt)) return true;
    return Date.now() >= expiresAt - REFRESH_SKEW_MS;
  }

  /**
   * Returns a valid access token, refreshing proactively when close to expiry.
   * Returns null only when there is no session (or refresh permanently failed).
   */
  async ensureValidToken(): Promise<string | null> {
    const accessToken = await AsyncStorage.getItem("accessToken");
    if (!accessToken) return null;

    // Mock tokens never expire.
    if (accessToken.startsWith("mock-")) {
      return accessToken;
    }

    const needsRefresh = await this.isAccessTokenExpiringSoon();
    if (!needsRefresh) {
      return accessToken;
    }

    const refreshed = await this.refreshAccessToken();
    if (refreshed) return refreshed;
    // Refresh may have ended the session; re-read storage instead of returning a stale token.
    return AsyncStorage.getItem("accessToken");
  }

  private async refreshAccessToken(_options?: { force?: boolean }): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const refreshToken = await AsyncStorage.getItem("refreshToken");
          // Skip refresh for mock tokens — they never expire.
          if (!refreshToken || refreshToken.startsWith("mock-")) {
            return AsyncStorage.getItem("accessToken");
          }

          // Use a bare axios call so the interceptors cannot recurse.
          const response = await axios.post(
            `${this.baseURL}/auth/refresh-token`,
            { refreshToken },
            { timeout: 30000 }
          );

          const tokens = this.extractTokens(response.data);
          if (!tokens) {
            // Malformed success payload — do not wipe the session; retry later.
            return await AsyncStorage.getItem("accessToken");
          }

          await this.saveTokens(tokens);
          this.notifyTokensUpdated(tokens);
          return tokens.accessToken;
        } catch (error) {
          const status = (error as AxiosError)?.response?.status;
          // Only end the session when the refresh token itself is rejected.
          // Network / 5xx errors must keep the user logged in.
          if (status === 400 || status === 401 || status === 403) {
            await this.clearTokens();
            this.notifySessionExpired();
            return null;
          }
          return await AsyncStorage.getItem("accessToken");
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
    const expiresAt = String(Date.now() + tokens.expiresIn * 1000);
    await AsyncStorage.multiSet([
      ["accessToken", tokens.accessToken],
      ["refreshToken", tokens.refreshToken],
      [TOKEN_EXPIRES_AT_KEY, expiresAt],
    ]);
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      "accessToken",
      "refreshToken",
      TOKEN_EXPIRES_AT_KEY,
    ]);
  }
}

export const apiClient = new ApiClient();
