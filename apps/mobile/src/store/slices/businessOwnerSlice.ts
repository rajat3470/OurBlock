import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Business, Order, Product } from "@types/index";

export interface BusinessOwnerStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockProducts: number;
  todayRevenue: number;
}

interface BusinessOwnerState {
  businessProfile: Business | null;
  products: Product[];
  orders: Order[];
  stats: BusinessOwnerStats | null;
  selectedOrderId: string | null;
  selectedProductId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BusinessOwnerState = {
  businessProfile: null,
  products: [],
  orders: [],
  stats: null,
  selectedOrderId: null,
  selectedProductId: null,
  isLoading: false,
  error: null,
};

const businessOwnerSlice = createSlice({
  name: "businessOwner",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setBusinessProfile(state, action: PayloadAction<Business>) {
      state.businessProfile = action.payload;
      state.error = null;
    },
    setProducts(state, action: PayloadAction<Product[]>) {
      state.products = action.payload;
      state.error = null;
    },
    addProduct(state, action: PayloadAction<Product>) {
      state.products.unshift(action.payload);
    },
    updateProduct(state, action: PayloadAction<Product>) {
      const index = state.products.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },
    removeProduct(state, action: PayloadAction<string>) {
      state.products = state.products.filter((p) => p.id !== action.payload);
    },
    setOrders(state, action: PayloadAction<Order[]>) {
      state.orders = action.payload;
      state.error = null;
    },
    updateOrder(state, action: PayloadAction<Order>) {
      const index = state.orders.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    },
    setStats(state, action: PayloadAction<BusinessOwnerStats>) {
      state.stats = action.payload;
      state.error = null;
    },
    setSelectedOrderId(state, action: PayloadAction<string | null>) {
      state.selectedOrderId = action.payload;
    },
    setSelectedProductId(state, action: PayloadAction<string | null>) {
      state.selectedProductId = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
    clearBusinessOwnerState() {
      return initialState;
    },
  },
});

export const {
  setLoading,
  setBusinessProfile,
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setOrders,
  updateOrder,
  setStats,
  setSelectedOrderId,
  setSelectedProductId,
  setError,
  clearError,
  clearBusinessOwnerState,
} = businessOwnerSlice.actions;

export default businessOwnerSlice.reducer;
