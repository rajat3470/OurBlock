import { Platform } from "react-native";

const AD_UNITS = {
  REWARDED_IOS: "ca-app-pub-3723453526316266/4275584013",
  REWARDED_ANDROID: "ca-app-pub-3723453526316266/9440105776",
  REWARDED_INTERSTITIAL_IOS: "ca-app-pub-3723453526316266/4275584013",
  REWARDED_INTERSTITIAL_ANDROID: "ca-app-pub-3723453526316266/1753187445",
  NATIVE_IOS: "ca-app-pub-3723453526316266/4311153748",
  NATIVE_ANDROID: "ca-app-pub-3723453526316266/8954029777",
  BANNER_IOS: "ca-app-pub-3723453526316266/5680999176",
  BANNER_ANDROID: "ca-app-pub-3723453526316266/6694697947",
} as const;

const TEST_IDS = {
  REWARDED_IOS: "ca-app-pub-3940256099942544/1712485313",
  REWARDED_ANDROID: "ca-app-pub-3940256099942544/5354046379",
  REWARDED_INTERSTITIAL_IOS: "ca-app-pub-3940256099942544/6978759866",
  REWARDED_INTERSTITIAL_ANDROID: "ca-app-pub-3940256099942544/5354046379",
  NATIVE_IOS: "ca-app-pub-3940256099942544/3986624511",
  NATIVE_ANDROID: "ca-app-pub-3940256099942544/2247696110",
  BANNER_IOS: "ca-app-pub-3940256099942544/2934735716",
  BANNER_ANDROID: "ca-app-pub-3940256099942544/6300978111",
} as const;

type AdType = "REWARDED" | "REWARDED_INTERSTITIAL" | "NATIVE" | "BANNER";

// Set to false once AdMob activates your production ad units (usually 24-48h after creation)
const USE_TEST_ADS = true;

function getUnitId(type: AdType): string {
  const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";
  const key = `${type}_${platform}` as keyof typeof AD_UNITS;
  return (__DEV__ || USE_TEST_ADS) ? TEST_IDS[key] : AD_UNITS[key];
}

export function getRewardedAdUnitId(): string {
  return getUnitId("REWARDED");
}

export function getRewardedInterstitialAdUnitId(): string {
  return getUnitId("REWARDED_INTERSTITIAL");
}

export function getNativeAdUnitId(): string {
  return getUnitId("NATIVE");
}

export function getBannerAdUnitId(): string {
  return getUnitId("BANNER");
}

async function loadAdsModule() {
  try {
    return await import("react-native-google-mobile-ads");
  } catch (error) {
    return null;
  }
}

export async function initializeMobileAds(): Promise<void> {
  const mobileAds = await loadAdsModule();
  if (!mobileAds) return;

  await mobileAds.default().initialize();
  await mobileAds.default().setRequestConfiguration({
    maxAdContentRating: mobileAds.MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
}
