import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  businessId: string;
  businessName: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  unit?: string;      // "piece" | "g" | "kg" | "ml" | "L" — for display
  unitStep?: number;  // purchasable increment in that unit
  selectedAttributes?: { name: string; value: string }[]; // chosen customization options
}

interface CartState {
  items: CartItem[];
  businessId: string | null; // cart is locked to one business at a time
}

const initialState: CartState = {
  items: [],
  businessId: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const item = action.payload;
      if (item.maxQuantity <= 0) {
        return;
      }
      // Cart stays locked to one business; UI should confirm before clearing.
      if (state.businessId && state.businessId !== item.businessId) {
        return;
      }
      state.businessId = item.businessId;

      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + item.quantity,
          existing.maxQuantity
        );
      } else {
        state.items.push({ ...item });
      }
    },

    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
      if (state.items.length === 0) state.businessId = null;
    },

    updateQuantity(
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (!item) return;
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.productId !== productId);
        if (state.items.length === 0) state.businessId = null;
      } else {
        item.quantity = Math.min(quantity, item.maxQuantity);
      }
    },

    clearCart(state) {
      state.items = [];
      state.businessId = null;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
