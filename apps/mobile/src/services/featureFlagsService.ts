import Constants from "expo-constants";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  FeatureFlags,
  REMOTE_CONFIG_DEFAULTS,
} from "@/constants/featureFlags";

// Lazily resolve the native Remote Config module so that
// importing this service never throws in Expo Go or bare
// environments where the native module has not been linked.
type RCModule = ReturnType<typeof import("@react-native-firebase/remote-config").default>;

const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

let _rcModule: RCModule | null = null;

const getRC = (): RCModule | null => {
  if (IS_EXPO_GO) return null;
  if (_rcModule !== null) return _rcModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-firebase/remote-config").default;
    _rcModule = mod();
    return _rcModule;
  } catch {
    return null;
  }
};

const DEFAULT_FETCH_INTERVAL_MS = __DEV__ ? 30 * 1000 : 5 * 60 * 1000;

export type FeatureFlagsSnapshot = {
  values: FeatureFlags;
  lastFetchStatus: string;
  lastFetchTime: number | null;
};

const defaultSnapshot = (): FeatureFlagsSnapshot => ({
  values: { ...DEFAULT_FEATURE_FLAGS },
  lastFetchStatus: "native-module-unavailable",
  lastFetchTime: null,
});

const asPositiveInt = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : fallback;
};

const buildSnapshot = (rc: RCModule): FeatureFlagsSnapshot => {
  const values: FeatureFlags = {
    adsEnabled: rc.getValue(FEATURE_FLAG_KEYS.ADS_ENABLED).asBoolean(),
    adsNativeFeedEnabled: rc.getValue(FEATURE_FLAG_KEYS.ADS_NATIVE_FEED_ENABLED).asBoolean(),
    adsNativeListingEnabled: rc.getValue(FEATURE_FLAG_KEYS.ADS_NATIVE_LISTING_ENABLED).asBoolean(),
    adsRewardedEnabled: rc.getValue(FEATURE_FLAG_KEYS.ADS_REWARDED_ENABLED).asBoolean(),
    adsRewardedMinRs: asPositiveInt(
      rc.getValue(FEATURE_FLAG_KEYS.ADS_REWARDED_MIN_RS).asNumber(),
      DEFAULT_FEATURE_FLAGS.adsRewardedMinRs
    ),
    adsRewardedMaxRs: asPositiveInt(
      rc.getValue(FEATURE_FLAG_KEYS.ADS_REWARDED_MAX_RS).asNumber(),
      DEFAULT_FEATURE_FLAGS.adsRewardedMaxRs
    ),
    adsDensityEveryNthCard: asPositiveInt(
      rc.getValue(FEATURE_FLAG_KEYS.ADS_DENSITY_EVERY_NTH_CARD).asNumber(),
      DEFAULT_FEATURE_FLAGS.adsDensityEveryNthCard
    ),
    adsRewardedMaxClaimsPerDay: asPositiveInt(
      rc.getValue(FEATURE_FLAG_KEYS.ADS_REWARDED_MAX_CLAIMS_PER_DAY).asNumber(),
      DEFAULT_FEATURE_FLAGS.adsRewardedMaxClaimsPerDay
    ),
  };

  if (values.adsRewardedMaxRs < values.adsRewardedMinRs) {
    values.adsRewardedMaxRs = values.adsRewardedMinRs;
  }

  return {
    values,
    lastFetchStatus: String(rc.lastFetchStatus ?? "no-fetch-yet"),
    lastFetchTime: Number.isFinite(rc.fetchTimeMillis) ? rc.fetchTimeMillis : null,
  };
};

class FeatureFlagsService {
  private hasInitialized = false;

  async initialize(): Promise<FeatureFlagsSnapshot> {
    const rc = getRC();
    if (!rc) return defaultSnapshot();

    try {
      if (!this.hasInitialized) {
        await rc.setDefaults(REMOTE_CONFIG_DEFAULTS);
        await rc.setConfigSettings({ minimumFetchIntervalMillis: DEFAULT_FETCH_INTERVAL_MS });
        this.hasInitialized = true;
      }
      await rc.fetchAndActivate();
    } catch (err) {
      console.warn("[FeatureFlags] fetchAndActivate failed, using cached/defaults:", err);
    }

    try {
      return buildSnapshot(rc);
    } catch (err) {
      console.warn("[FeatureFlags] buildSnapshot failed:", err);
      return defaultSnapshot();
    }
  }

  async refresh(): Promise<FeatureFlagsSnapshot> {
    const rc = getRC();
    if (!rc) return defaultSnapshot();

    try {
      await rc.fetchAndActivate();
    } catch (err) {
      console.warn("[FeatureFlags] refresh fetchAndActivate failed:", err);
    }

    try {
      return buildSnapshot(rc);
    } catch (err) {
      console.warn("[FeatureFlags] refresh buildSnapshot failed:", err);
      return defaultSnapshot();
    }
  }

  getSnapshot(): FeatureFlagsSnapshot {
    const rc = getRC();
    if (!rc) return defaultSnapshot();
    try {
      return buildSnapshot(rc);
    } catch (err) {
      console.warn("[FeatureFlags] getSnapshot failed:", err);
      return defaultSnapshot();
    }
  }
}

export const featureFlagsService = new FeatureFlagsService();
