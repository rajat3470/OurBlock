import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import BrandLogo from "../../src/components/ui/BrandLogo";
import { iconArrowRightXml } from "../../src/components/ui/iconArrowRightXml";
import { iconHouseXml } from "../../src/components/ui/iconHouseXml";
import { iconStoreXml } from "../../src/components/ui/iconStoreXml";
import { brand, fonts } from "../../src/constants/theme";
import { AppTarget } from "../../src/utils/appRouting";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const appTarget = process.env.EXPO_PUBLIC_APP_TARGET as AppTarget;

  const showOwner = !appTarget || appTarget === "businessOwner";
  const showResident = !appTarget || appTarget === "user";
  const showDelivery = appTarget === "deliveryPartner" || !appTarget;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 12 }]}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <BrandLogo size="compact" />
        <Text style={styles.title}>
          Welcome to{"\n"}Mohalla Mittar
        </Text>
        <Text style={styles.subtitle}>
          Your mohalla's shops, delivered — or run your own storefront right from here.
        </Text>
      </View>

      <View style={styles.cards}>
        {showResident ? (
          <TouchableOpacity
            style={[styles.card, styles.cardPrimary]}
            activeOpacity={0.88}
            onPress={() => router.push("/(auth)/user-login")}
          >
            <View style={[styles.houseIcon, styles.houseIconSelected]}>
              <SvgXml xml={iconHouseXml} width={20} height={20} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>I'm a Resident</Text>
              <Text style={styles.cardHint}>Order from nearby shops</Text>
            </View>
            <SvgXml xml={iconArrowRightXml} width={24} height={24} />
          </TouchableOpacity>
        ) : null}

        {showOwner ? (
          <TouchableOpacity
            style={[styles.card, styles.cardSecondary]}
            activeOpacity={0.88}
            onPress={() => router.push("/(auth)/business-owner-login")}
          >
            <SvgXml xml={iconStoreXml.replace("#E0A030", brand.teal)} width={36} height={36} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>I'm a Business Owner</Text>
              <Text style={styles.cardHint}>List your shop & manage orders</Text>
            </View>
            <SvgXml xml={iconArrowRightXml} width={24} height={24} />
          </TouchableOpacity>
        ) : null}

        {showDelivery ? (
          <TouchableOpacity
            onPress={() => router.push("/(auth)/delivery-partner-login")}
            activeOpacity={0.8}
          >
            <Text style={styles.deliveryLink}>I'm a delivery partner</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.primary,
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    width: 295,
    lineHeight: 22,
  },
  cards: {
    gap: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    height: 82,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1.5,
  },
  cardPrimary: {
    backgroundColor: "rgba(224,160,48,0.12)",
    borderColor: brand.accentDark,
  },
  cardSecondary: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
  },
  houseIcon: {
    width: 36,
    height: 36,
    borderRadius: 6.75,
    backgroundColor: brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  houseIconSelected: {
    backgroundColor: brand.accentDark,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: "#FFFFFF",
  },
  cardHint: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  deliveryLink: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    paddingVertical: 4,
  },
});
