import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { getBannerAdUnitId } from "../services/adService";

type AdModule = typeof import("react-native-google-mobile-ads");

type SizeKey = "BANNER" | "LARGE_BANNER" | "MEDIUM_RECTANGLE";

export function BannerAdStrip({ size = "BANNER" }: { size?: SizeKey }) {
  const [ads, setAds] = useState<AdModule | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("react-native-google-mobile-ads");
        if (!cancelled) setAds(mod);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ads || failed) return null;

  const { BannerAd, BannerAdSize } = ads;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize[size]}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
});
