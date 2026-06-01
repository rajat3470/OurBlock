import { useAppSelector } from "./useRedux";

export const useFeatureFlags = () => {
  const state = useAppSelector((s) => s.featureFlags);

  // In __DEV__ builds the dev drawer can set localOverrides on top of Remote Config values.
  const values = __DEV__
    ? { ...state.values, ...state.localOverrides }
    : state.values;

  const adsMasterEnabled = values.adsEnabled;

  return {
    ...state,
    values,
    adsMasterEnabled,
    isNativeFeedEnabled: adsMasterEnabled && values.adsNativeFeedEnabled,
    isNativeListingEnabled: adsMasterEnabled && values.adsNativeListingEnabled,
    isRewardedEnabled: adsMasterEnabled && values.adsRewardedEnabled,
  };
};
