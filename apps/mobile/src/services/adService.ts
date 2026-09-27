import { Platform } from "react-native";

const AD_UNITS = {
  REWARDED_IOS: "ca-app-pub-3723453526316266/4275584013",
  REWARDED_ANDROID: "ca-app-pub-3940256099942544/5354046379", // TODO: replace with real Android ID
  NATIVE_IOS: "ca-app-pub-3723453526316266/6901747350",
  NATIVE_ANDROID: "ca-app-pub-3940256099942544/2247696110", // TODO: replace with real Android ID
} as const;

export function getRewardedAdUnitId(): string {
  if (__DEV__) {
    return Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/1712485313"
      : "ca-app-pub-3940256099942544/5354046379";
  }
  return Platform.OS === "ios" ? AD_UNITS.REWARDED_IOS : AD_UNITS.REWARDED_ANDROID;
}

export function getNativeAdUnitId(): string {
  if (__DEV__) {
    return Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/3986624511"
      : "ca-app-pub-3940256099942544/2247696110";
  }
  return Platform.OS === "ios" ? AD_UNITS.NATIVE_IOS : AD_UNITS.NATIVE_ANDROID;
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
