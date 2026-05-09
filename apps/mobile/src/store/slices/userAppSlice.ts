import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Business, Order, Product, Society } from "@/types";

export interface UserAppStats {
  totalBusinesses: number;
  activeOrders: number;
  favoriteCount: number;
}

interface UserAppState {
  societies: Society[];
  selectedSocietyId: string | null;
  businesses: Business[];
  featuredProducts: Product[];
  orders: Order[];
  favoriteBusinessIds: string[];
  stats: UserAppStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserAppState = {
  societies: [],
  selectedSocietyId: null,
  businesses: [],
  featuredProducts: [],
  orders: [],
  favoriteBusinessIds: [],
  stats: null,
  isLoading: false,
  error: null,
};

const userAppSlice = createSlice({
  name: "userApp",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setSocieties(state, action: PayloadAction<Society[]>) {
      state.societies = action.payload;
      state.error = null;
    },
    setSelectedSocietyId(state, action: PayloadAction<string | null>) {
      state.selectedSocietyId = action.payload;
    },
    setBusinesses(state, action: PayloadAction<Business[]>) {
      state.businesses = action.payload;
      state.error = null;
    },
    setFeaturedProducts(state, action: PayloadAction<Product[]>) {
      state.featuredProducts = action.payload;
      state.error = null;
    },
    setOrders(state, action: PayloadAction<Order[]>) {
      state.orders = action.payload;
      state.error = null;
    },
    setStats(state, action: PayloadAction<UserAppStats>) {
      state.stats = action.payload;
      state.error = null;
    },
    toggleFavoriteBusiness(state, action: PayloadAction<string>) {
      if (state.favoriteBusinessIds.includes(action.payload)) {
        state.favoriteBusinessIds = state.favoriteBusinessIds.filter(
          (id) => id !== action.payload
        );
      } else {
        state.favoriteBusinessIds.push(action.payload);
      }
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
    clearUserAppState() {
      return initialState;
    },
  },
});

export const {
  setLoading,
  setSocieties,
  setSelectedSocietyId,
  setBusinesses,
  setFeaturedProducts,
  setOrders,
  setStats,
  toggleFavoriteBusiness,
  setError,
  clearError,
  clearUserAppState,
} = userAppSlice.actions;

export default userAppSlice.reducer;
