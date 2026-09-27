import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getNativeAdUnitId } from "../services/adService";

type AdModule = typeof import("react-native-google-mobile-ads");

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

  if (!ads || failed) {
    return (
      <View style={[styles.wrapper, style]}>
        <FallbackCard />
      </View>
    );
  }

  const { BannerAd, BannerAdSize } = ads;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.adLabelRow}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
      </View>
      <View style={styles.bannerWrap}>
        <BannerAd
          unitId={getNativeAdUnitId()}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdFailedToLoad={() => setFailed(true)}
        />
      </View>
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
  adLabelRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  bannerWrap: {
    alignItems: "center",
    paddingBottom: 6,
  },
  fallbackCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
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
