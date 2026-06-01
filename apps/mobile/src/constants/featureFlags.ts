export const FEATURE_FLAG_KEYS = {
  ADS_ENABLED: "ads.enabled",
  ADS_NATIVE_FEED_ENABLED: "ads.nativeFeed.enabled",
  ADS_NATIVE_LISTING_ENABLED: "ads.nativeListing.enabled",
  ADS_REWARDED_ENABLED: "ads.rewarded.enabled",
  ADS_REWARDED_MIN_RS: "ads.rewarded.minRs",
  ADS_REWARDED_MAX_RS: "ads.rewarded.maxRs",
  ADS_DENSITY_EVERY_NTH_CARD: "ads.density.everyNthCard",
  ADS_REWARDED_MAX_CLAIMS_PER_DAY: "ads.rewarded.maxClaimsPerDay",
} as const;

export interface FeatureFlags {
  adsEnabled: boolean;
  adsNativeFeedEnabled: boolean;
  adsNativeListingEnabled: boolean;
  adsRewardedEnabled: boolean;
  adsRewardedMinRs: number;
  adsRewardedMaxRs: number;
  adsDensityEveryNthCard: number;
  adsRewardedMaxClaimsPerDay: number;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  adsEnabled: false,
  adsNativeFeedEnabled: false,
  adsNativeListingEnabled: false,
  adsRewardedEnabled: false,
  adsRewardedMinRs: 2,
  adsRewardedMaxRs: 5,
  adsDensityEveryNthCard: 4,
  adsRewardedMaxClaimsPerDay: 1,
};

export const REMOTE_CONFIG_DEFAULTS: Record<string, string | number | boolean> = {
  [FEATURE_FLAG_KEYS.ADS_ENABLED]: DEFAULT_FEATURE_FLAGS.adsEnabled,
  [FEATURE_FLAG_KEYS.ADS_NATIVE_FEED_ENABLED]: DEFAULT_FEATURE_FLAGS.adsNativeFeedEnabled,
  [FEATURE_FLAG_KEYS.ADS_NATIVE_LISTING_ENABLED]: DEFAULT_FEATURE_FLAGS.adsNativeListingEnabled,
  [FEATURE_FLAG_KEYS.ADS_REWARDED_ENABLED]: DEFAULT_FEATURE_FLAGS.adsRewardedEnabled,
  [FEATURE_FLAG_KEYS.ADS_REWARDED_MIN_RS]: DEFAULT_FEATURE_FLAGS.adsRewardedMinRs,
  [FEATURE_FLAG_KEYS.ADS_REWARDED_MAX_RS]: DEFAULT_FEATURE_FLAGS.adsRewardedMaxRs,
  [FEATURE_FLAG_KEYS.ADS_DENSITY_EVERY_NTH_CARD]: DEFAULT_FEATURE_FLAGS.adsDensityEveryNthCard,
  [FEATURE_FLAG_KEYS.ADS_REWARDED_MAX_CLAIMS_PER_DAY]: DEFAULT_FEATURE_FLAGS.adsRewardedMaxClaimsPerDay,
};
