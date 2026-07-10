import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, gradients, radius, spacing } from "@/constants/theme";

type RoleCard = {
  role: "superAdmin" | "businessOwner" | "user";
  emoji: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
  route: string;
};

const ROLES: RoleCard[] = [
  {
    role: "user",
    emoji: "👤",
    title: "Resident",
    subtitle: "Shop from your society",
    gradient: gradients.user,
    route: "/(auth)/user-login",
  },
  {
    role: "businessOwner",
    emoji: "🏪",
    title: "Business Owner",
    subtitle: "Manage your store",
    gradient: gradients.businessOwner,
    route: "/(auth)/business-owner-login",
  },
  {
    role: "superAdmin",
    emoji: "🔐",
    title: "Super Admin",
    subtitle: "Manage mohallaMitr",
    gradient: gradients.superAdmin,
    route: "/(auth)/super-admin-login",
  },
];

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.appBackground} style={StyleSheet.absoluteFill} />
      <SafeAreaView
        style={[
          styles.safe,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>mohallaMitr</Text>
          <Text style={styles.tagline}>Your Society's Marketplace</Text>
        </View>

        <View style={styles.cards}>
          {ROLES.map((item) => (
            <TouchableOpacity
              key={item.role}
              activeOpacity={0.9}
              onPress={() => router.push(item.route as any)}
              style={styles.card}
            >
              <LinearGradient colors={item.gradient} style={styles.cardGradient}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.surface,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
    elevation: 4,
  },
  cardGradient: {
    padding: spacing.xxl,
    alignItems: "center",
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
});
