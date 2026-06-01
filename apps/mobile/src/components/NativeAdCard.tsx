import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export function NativeAdCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={["#FFF1F2", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
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
        <View style={styles.rightWrap}>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>Ad</Text>
          </View>
          <TouchableOpacity style={styles.cta} activeOpacity={0.8}>
            <Text style={styles.ctaText}>Learn</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
  },
  card: {
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
  rightWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  adBadge: {
    backgroundColor: "rgba(220,38,38,0.1)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#DC2626",
  },
  cta: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
