import { Platform } from "react-native";

const AD_UNITS = {
  REWARDED_IOS: "ca-app-pub-3723453526316266/4275584013",
  REWARDED_ANDROID: "ca-app-pub-3940256099942544/5354046379", // TODO: replace with real Android ID
  NATIVE_IOS: "ca-app-pub-3723453526316266/4311153748",
  NATIVE_ANDROID: "ca-app-pub-3940256099942544/2247696110", // TODO: replace with real Android ID
  BANNER_IOS: "ca-app-pub-3723453526316266/5680999176",
  BANNER_ANDROID: "ca-app-pub-3940256099942544/6300978111", // TODO: replace with real Android ID
} as const;

const TEST_IDS = {
  REWARDED_IOS: "ca-app-pub-3940256099942544/1712485313",
  REWARDED_ANDROID: "ca-app-pub-3940256099942544/5354046379",
  NATIVE_IOS: "ca-app-pub-3940256099942544/3986624511",
  NATIVE_ANDROID: "ca-app-pub-3940256099942544/2247696110",
  BANNER_IOS: "ca-app-pub-3940256099942544/2934735716",
  BANNER_ANDROID: "ca-app-pub-3940256099942544/6300978111",
} as const;

function getUnitId(type: "REWARDED" | "NATIVE" | "BANNER"): string {
  const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";
  const key = `${type}_${platform}` as const;
  return __DEV__ ? TEST_IDS[key] : AD_UNITS[key];
}

export function getRewardedAdUnitId(): string {
  return getUnitId("REWARDED");
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
