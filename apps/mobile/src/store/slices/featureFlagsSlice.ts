import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from "@/constants/featureFlags";

interface FeatureFlagsState {
  values: FeatureFlags;
  /** Dev-only local overrides. Merged on top of `values` in useFeatureFlags. */
  localOverrides: Partial<FeatureFlags>;
  initialized: boolean;
  isRefreshing: boolean;
  lastFetchStatus: string;
  lastFetchTime: number | null;
  error: string | null;
}

const initialState: FeatureFlagsState = {
  values: DEFAULT_FEATURE_FLAGS,
  localOverrides: {},
  initialized: false,
  isRefreshing: false,
  lastFetchStatus: "no-fetch-yet",
  lastFetchTime: null,
  error: null,
};

const featureFlagsSlice = createSlice({
  name: "featureFlags",
  initialState,
  reducers: {
    setFlags(
      state,
      action: PayloadAction<{
        values: FeatureFlags;
        lastFetchStatus: string;
        lastFetchTime: number | null;
      }>
    ) {
      state.values = action.payload.values;
      state.lastFetchStatus = action.payload.lastFetchStatus;
      state.lastFetchTime = action.payload.lastFetchTime;
      state.initialized = true;
      state.error = null;
    },
    setRefreshing(state, action: PayloadAction<boolean>) {
      state.isRefreshing = action.payload;
    },
    setFeatureFlagsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    /** Dev-only: set a single flag override. No-op in production. */
    setLocalOverride(
      state,
      action: PayloadAction<{ key: keyof FeatureFlags; value: FeatureFlags[keyof FeatureFlags] }>
    ) {
      if (__DEV__) {
        (state.localOverrides as any)[action.payload.key] = action.payload.value;
      }
    },
  },
});

export const { setFlags, setRefreshing, setFeatureFlagsError, setLocalOverride } =
  featureFlagsSlice.actions;

export default featureFlagsSlice.reducer;
