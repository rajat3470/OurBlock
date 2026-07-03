import { Platform } from "react-native";

// Replace with your real AdMob ad unit IDs before going to production.
// These are Google's official test ad unit IDs.
const AD_UNITS = {
  REWARDED_IOS: "ca-app-pub-3940256099942544/1712485313",
  REWARDED_ANDROID: "ca-app-pub-3940256099942544/5354046379",
} as const;

export function getRewardedAdUnitId(): string {
  return Platform.OS === "ios" ? AD_UNITS.REWARDED_IOS : AD_UNITS.REWARDED_ANDROID;
}

async function loadAdsModule() {
  try {
    return await import("react-native-google-mobile-ads");
  } catch (error) {
    console.warn("[AdService] Mobile ads module unavailable:", error);
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
