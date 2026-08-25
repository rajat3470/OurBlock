import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from "@/constants/featureFlags";
import { apiClient } from "./apiClient";

export type FeatureFlagsSnapshot = {
  values: FeatureFlags;
  lastFetchStatus: string;
  lastFetchTime: number | null;
};

const defaultSnapshot = (): FeatureFlagsSnapshot => ({
  values: { ...DEFAULT_FEATURE_FLAGS },
  lastFetchStatus: "not-fetched",
  lastFetchTime: null,
});

const asPositiveInt = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : fallback;
};

class FeatureFlagsService {
  private cachedSnapshot: FeatureFlagsSnapshot = defaultSnapshot();

  async initialize(): Promise<FeatureFlagsSnapshot> {
    return this.refresh();
  }

  async refresh(): Promise<FeatureFlagsSnapshot> {
    try {
      const res = await apiClient.get("/feature-flags");
      if (res.data?.success && res.data?.data) {
        const raw = res.data.data as Partial<FeatureFlags>;
        const values: FeatureFlags = {
          adsEnabled: raw.adsEnabled ?? DEFAULT_FEATURE_FLAGS.adsEnabled,
          adsNativeFeedEnabled: raw.adsNativeFeedEnabled ?? DEFAULT_FEATURE_FLAGS.adsNativeFeedEnabled,
          adsNativeListingEnabled: raw.adsNativeListingEnabled ?? DEFAULT_FEATURE_FLAGS.adsNativeListingEnabled,
          adsRewardedEnabled: raw.adsRewardedEnabled ?? DEFAULT_FEATURE_FLAGS.adsRewardedEnabled,
          adsRewardedMinRs: asPositiveInt(raw.adsRewardedMinRs ?? 0, DEFAULT_FEATURE_FLAGS.adsRewardedMinRs),
          adsRewardedMaxRs: asPositiveInt(raw.adsRewardedMaxRs ?? 0, DEFAULT_FEATURE_FLAGS.adsRewardedMaxRs),
          adsDensityEveryNthCard: asPositiveInt(raw.adsDensityEveryNthCard ?? 0, DEFAULT_FEATURE_FLAGS.adsDensityEveryNthCard),
          adsRewardedMaxClaimsPerDay: asPositiveInt(raw.adsRewardedMaxClaimsPerDay ?? 0, DEFAULT_FEATURE_FLAGS.adsRewardedMaxClaimsPerDay),
        };
        if (values.adsRewardedMaxRs < values.adsRewardedMinRs) {
          values.adsRewardedMaxRs = values.adsRewardedMinRs;
        }
        this.cachedSnapshot = { values, lastFetchStatus: "success", lastFetchTime: Date.now() };
      }
    } catch {
      // Use cached / default values on fetch failure.
    }
    return this.cachedSnapshot;
  }

  getSnapshot(): FeatureFlagsSnapshot {
    return this.cachedSnapshot;
  }
}

export const featureFlagsService = new FeatureFlagsService();
