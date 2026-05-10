import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthToken, User } from "@/types";

const AUTH_USER_KEY = "authUser";

type PersistedAuth = {
  user: User;
  tokens: AuthToken;
};

export const authStateService = {
  async saveAuth(data: PersistedAuth): Promise<void> {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    await AsyncStorage.multiSet([
      ["accessToken", data.tokens.accessToken],
      ["refreshToken", data.tokens.refreshToken],
    ]);
  },

  async loadAuth(): Promise<PersistedAuth | null> {
    const [[, accessToken], [, refreshToken], [, rawUser]] = await AsyncStorage.multiGet([
      "accessToken",
      "refreshToken",
      AUTH_USER_KEY,
    ]);

    if (!accessToken || !refreshToken || !rawUser) {
      await this.clearAuth();
      return null;
    }

    try {
      const user = JSON.parse(rawUser) as User;
      return {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
      };
    } catch {
      await this.clearAuth();
      return null;
    }
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", AUTH_USER_KEY]);
  },

  async updateUser(user: User): Promise<void> {
    const current = await this.loadAuth();
    if (!current) return;
    await this.saveAuth({ user, tokens: current.tokens });
  },
};
