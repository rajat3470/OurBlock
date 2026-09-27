import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getNativeAdUnitId } from "../services/adService";

type AdLoadState = "loading" | "loaded" | "error";

function FallbackCard() {
  return (
    <LinearGradient
      colors={["#FFF1F2", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fallbackCard}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="megaphone-outline" size={22} color="#DC2626" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.headline} numberOfLines={1}>
          Promote your business
        </Text>
        <Text style={styles.subline} numberOfLines={1}>
          Reach 1,000+ neighbors near you
        </Text>
      </View>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Ad</Text>
      </View>
    </LinearGradient>
  );
}

export function NativeAdCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const [adState, setAdState] = useState<AdLoadState>("loading");
  const [adComponents, setAdComponents] = useState<any>(null);
  const nativeAdRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ads = await import("react-native-google-mobile-ads");
        if (!cancelled) setAdComponents(ads);
      } catch {
        if (!cancelled) setAdState("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onAdLoaded = useCallback(() => setAdState("loaded"), []);
  const onAdFailedToLoad = useCallback(() => setAdState("error"), []);

  if (!adComponents || adState === "error") {
    return (
      <View style={[styles.wrapper, style]}>
        <FallbackCard />
      </View>
    );
  }

  const { NativeAdView, NativeAsset, NativeMediaView, CallToActionView } = adComponents;

  return (
    <View style={[styles.wrapper, style]}>
      <NativeAdView
        ref={nativeAdRef}
        adUnitId={getNativeAdUnitId()}
        onAdLoaded={onAdLoaded}
        onAdFailedToLoad={onAdFailedToLoad}
        requestNonPersonalizedAdsOnly={false}
      >
        <View style={styles.nativeCard}>
          <View style={styles.nativeTop}>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Ad</Text>
            </View>
          </View>

          <NativeMediaView style={styles.mediaView} />

          <View style={styles.nativeBody}>
            <NativeAsset assetType="headline">
              <Text style={styles.headline} numberOfLines={2} />
            </NativeAsset>
            <NativeAsset assetType="body">
              <Text style={styles.subline} numberOfLines={2} />
            </NativeAsset>
          </View>

          <CallToActionView style={styles.ctaButton}>
            <Text style={styles.ctaText}>Learn more</Text>
          </CallToActionView>
        </View>
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  fallbackCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  nativeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
  },
  nativeTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  mediaView: {
    width: "100%",
    height: 150,
    backgroundColor: "#F3F4F6",
  },
  nativeBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 4,
  },
  ctaButton: {
    backgroundColor: "#084C3D",
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(220,38,38,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  headline: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  subline: {
    fontSize: 11,
    color: "#6B7280",
  },
  adBadge: {
    backgroundColor: "rgba(220,38,38,0.1)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#DC2626",
  },
});
