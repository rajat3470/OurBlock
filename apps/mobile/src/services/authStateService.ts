import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthToken, User } from "@/types";

const AUTH_USER_KEY = "authUser";
const TOKEN_EXPIRES_AT_KEY = "tokenExpiresAt";

type PersistedAuth = {
  user: User;
  tokens: AuthToken;
};

export const authStateService = {
  async saveAuth(data: PersistedAuth): Promise<void> {
    const expiresAt = String(Date.now() + data.tokens.expiresIn * 1000);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    await AsyncStorage.multiSet([
      ["accessToken", data.tokens.accessToken],
      ["refreshToken", data.tokens.refreshToken],
      [TOKEN_EXPIRES_AT_KEY, expiresAt],
    ]);
  },

  async loadAuth(): Promise<PersistedAuth | null> {
    const [[, accessToken], [, refreshToken], [, rawUser], [, expiresAtRaw]] =
      await AsyncStorage.multiGet([
        "accessToken",
        "refreshToken",
        AUTH_USER_KEY,
        TOKEN_EXPIRES_AT_KEY,
      ]);

    // Refresh token alone is enough to restore a session; access token may be stale.
    if (!refreshToken || !rawUser) {
      await this.clearAuth();
      return null;
    }

    try {
      const user = JSON.parse(rawUser) as User;
      const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : NaN;
      const expiresIn = Number.isFinite(expiresAt)
        ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
        : 3600;

      return {
        user,
        tokens: {
          accessToken: accessToken ?? "",
          refreshToken,
          expiresIn,
        },
      };
    } catch {
      await this.clearAuth();
      return null;
    }
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      "accessToken",
      "refreshToken",
      TOKEN_EXPIRES_AT_KEY,
      AUTH_USER_KEY,
    ]);
  },

  async updateUser(user: User): Promise<void> {
    const current = await this.loadAuth();
    if (!current) return;
    await this.saveAuth({ user, tokens: current.tokens });
  },

  async updateTokens(tokens: AuthToken): Promise<void> {
    const current = await this.loadAuth();
    if (!current) {
      const expiresAt = String(Date.now() + tokens.expiresIn * 1000);
      await AsyncStorage.multiSet([
        ["accessToken", tokens.accessToken],
        ["refreshToken", tokens.refreshToken],
        [TOKEN_EXPIRES_AT_KEY, expiresAt],
      ]);
      return;
    }
    await this.saveAuth({ user: current.user, tokens });
  },
};
