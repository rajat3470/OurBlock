import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Business, HomeBanner, Order, Product, Society } from "@/types";

export interface UserAppStats {
  totalBusinesses: number;
  activeOrders: number;
  favoriteCount: number;
}

interface UserAppState {
  societies: Society[];
  selectedSocietyId: string | null;
  businesses: Business[];
  banners: HomeBanner[];
  featuredProducts: Product[];
  orders: Order[];
  // Order index for O(1) lookups
  ordersMap: Record<string, Order>;
  favoriteBusinessIds: string[];
  stats: UserAppStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserAppState = {
  societies: [],
  selectedSocietyId: null,
  businesses: [],
  banners: [],
  featuredProducts: [],
  orders: [],
  ordersMap: {},
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
    setBanners(state, action: PayloadAction<HomeBanner[]>) {
      state.banners = action.payload;
      state.error = null;
    },
    setFeaturedProducts(state, action: PayloadAction<Product[]>) {
      state.featuredProducts = action.payload;
      state.error = null;
    },
    setOrders(state, action: PayloadAction<Order[]>) {
      state.orders = action.payload;
      // Rebuild index
      state.ordersMap = action.payload.reduce((acc, order) => {
        acc[order.id] = order;
        return acc;
      }, {} as Record<string, Order>);
      state.error = null;
    },
    /** Upsert a single order from a socket event (insert or update in place). */
    upsertOrder(state, action: PayloadAction<Order>) {
      const order = action.payload;
      const existing = state.ordersMap[order.id];
      if (existing) {
        const idx = state.orders.findIndex((o) => o.id === order.id);
        if (idx !== -1) state.orders[idx] = order;
        state.ordersMap[order.id] = order;
      } else {
        state.orders.unshift(order);
        state.ordersMap[order.id] = order;
      }
    },
    /** Upsert a single business from a socket event (insert or update in place). */
    upsertBusiness(state, action: PayloadAction<Business>) {
      const business = action.payload;
      const idx = state.businesses.findIndex((b) => b.id === business.id);
      if (idx !== -1) {
        state.businesses[idx] = business;
      } else {
        state.businesses.push(business);
      }
    },
    /** Patch a single business field from a socket `business:status` event. */
    patchBusiness(state, action: PayloadAction<{ id: string } & Partial<Business>>) {
      const idx = state.businesses.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) {
        state.businesses[idx] = { ...state.businesses[idx], ...action.payload };
      }
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
      return { ...initialState, ordersMap: {} };
    },
  },
});

export const {
  setLoading,
  setSocieties,
  setSelectedSocietyId,
  setBusinesses,
  setBanners,
  setFeaturedProducts,
  setOrders,
  upsertOrder,
  upsertBusiness,
  patchBusiness,
  setStats,
  toggleFavoriteBusiness,
  setError,
  clearError,
  clearUserAppState,
} = userAppSlice.actions;

export default userAppSlice.reducer;
