import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Society } from "@/types";

interface SocietyState {
  selectedSociety: Society | null;
  societies: Society[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SocietyState = {
  selectedSociety: null,
  societies: [],
  isLoading: false,
  error: null,
};

const societySlice = createSlice({
  name: "society",
  initialState,
  reducers: {
    setSelectedSociety(state, action: PayloadAction<Society>) {
      state.selectedSociety = action.payload;
      state.error = null;
    },
    setSocieties(state, action: PayloadAction<Society[]>) {
      state.societies = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  setSelectedSociety,
  setSocieties,
  setLoading,
  setError,
  clearError,
} = societySlice.actions;

export default societySlice.reducer;
