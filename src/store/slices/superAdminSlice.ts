import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Society, Business, User } from "@types/index";

export interface SuperAdminStats {
  totalSocieties: number;
  totalBusinesses: number;
  pendingVerifications: number;
  totalUsers: number;
}

interface SuperAdminState {
  stats: SuperAdminStats | null;
  societies: Society[];
  allBusinesses: Business[];
  pendingBusinesses: Business[];
  allUsers: User[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SuperAdminState = {
  stats: null,
  societies: [],
  allBusinesses: [],
  pendingBusinesses: [],
  allUsers: [],
  isLoading: false,
  error: null,
};

const superAdminSlice = createSlice({
  name: "superAdmin",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setStats(state, action: PayloadAction<SuperAdminStats>) {
      state.stats = action.payload;
    },
    setSocieties(state, action: PayloadAction<Society[]>) {
      state.societies = action.payload;
    },
    addSociety(state, action: PayloadAction<Society>) {
      state.societies.unshift(action.payload);
      if (state.stats) state.stats.totalSocieties += 1;
    },
    updateSocietyItem(state, action: PayloadAction<Society>) {
      const idx = state.societies.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) state.societies[idx] = action.payload;
    },
    removeSociety(state, action: PayloadAction<string>) {
      state.societies = state.societies.filter((s) => s.id !== action.payload);
      if (state.stats) {
        state.stats.totalSocieties = Math.max(
          0,
          state.stats.totalSocieties - 1
        );
      }
    },
    setAllBusinesses(state, action: PayloadAction<Business[]>) {
      state.allBusinesses = action.payload;
      state.pendingBusinesses = action.payload.filter((b) => !b.isVerified);
    },
    updateBusinessItem(state, action: PayloadAction<Business>) {
      const idx = state.allBusinesses.findIndex(
        (b) => b.id === action.payload.id
      );
      if (idx !== -1) state.allBusinesses[idx] = action.payload;
      state.pendingBusinesses = state.allBusinesses.filter(
        (b) => !b.isVerified
      );
      if (state.stats) {
        state.stats.pendingVerifications = state.pendingBusinesses.length;
      }
    },
    setAllUsers(state, action: PayloadAction<User[]>) {
      state.allUsers = action.payload;
    },
    updateUserItem(state, action: PayloadAction<User>) {
      const idx = state.allUsers.findIndex((u) => u.id === action.payload.id);
      if (idx !== -1) state.allUsers[idx] = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setStats,
  setSocieties,
  addSociety,
  updateSocietyItem,
  removeSociety,
  setAllBusinesses,
  updateBusinessItem,
  setAllUsers,
  updateUserItem,
  setError,
  clearError,
} = superAdminSlice.actions;

export default superAdminSlice.reducer;
