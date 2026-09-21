import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { brand, fonts } from "../../src/constants/theme";

const ONBOARDING_GOLD = "#F7B954";
const hero = require("../../assets/brand/onboarding-courier.jpg");

const arrowUpRightXml = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.5 11.5L11.5 4.5M11.5 4.5H6.25M11.5 4.5V9.75" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.copy, { paddingTop: insets.top + 28 }]}>
        <Text style={styles.title}>
          Fuelling{"\n"}
          <Text style={styles.health}>Health</Text>
          {" with\n"}
          Freshness...
        </Text>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.86}
          onPress={() => router.push("/(auth)/welcome")}
          accessibilityRole="button"
          accessibilityLabel="Let's Order"
        >
          <Text style={styles.ctaLabel}>Let's Order</Text>
          <SvgXml xml={arrowUpRightXml} width={16} height={16} />
        </TouchableOpacity>
      </View>
      <View style={styles.heroWrap}>
        <Image
          source={hero}
          style={styles.hero}
          contentFit="cover"
          contentPosition="bottom center"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ONBOARDING_GOLD,
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  health: {
    color: "#C45C5C",
  },
  cta: {
    marginTop: 22,
    height: 42,
    paddingHorizontal: 22,
    borderRadius: 100,
    backgroundColor: brand.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  heroWrap: {
    flex: 1,
    overflow: "hidden",
    marginTop: 28,
  },
  hero: {
    flex: 1,
    width: "100%",
  },
});
