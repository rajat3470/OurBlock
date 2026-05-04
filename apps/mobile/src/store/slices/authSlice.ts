import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, AuthToken } from "@types/index";

interface AuthState {
  user: User | null;
  tokens: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    setTokens(state, action: PayloadAction<AuthToken>) {
      state.tokens = action.payload;
    },
    setAuth(state, action: PayloadAction<{ user: User; tokens: AuthToken }>) {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.error = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    logout(state) {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setUser,
  setTokens,
  setAuth,
  setError,
  logout,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
