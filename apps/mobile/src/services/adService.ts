import { Platform } from "react-native";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

// Replace with your real AdMob ad unit IDs before going to production.
// These are Google's official test ad unit IDs.
const AD_UNITS = {
  REWARDED_IOS: "ca-app-pub-3940256099942544/1712485313",
  REWARDED_ANDROID: "ca-app-pub-3940256099942544/5354046379",
} as const;

export function getRewardedAdUnitId(): string {
  return Platform.OS === "ios" ? AD_UNITS.REWARDED_IOS : AD_UNITS.REWARDED_ANDROID;
}

export async function initializeMobileAds(): Promise<void> {
  await mobileAds().initialize();
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
}
