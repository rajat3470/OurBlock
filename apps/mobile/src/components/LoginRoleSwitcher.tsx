import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, radius, spacing } from "../constants/theme";

export type LoginRoleOption = "user" | "businessOwner" | "deliveryPartner";

type RoleMeta = {
  key: LoginRoleOption;
  icon: string;
  label: string;
  hint: string;
  route: string;
  accent: string;
  soft: string;
};

const ROLES: RoleMeta[] = [
  {
    key: "user",
    icon: "🏠",
    label: "Resident",
    hint: "Order from local shops",
    route: "/(auth)/user-login",
    accent: "#0E9F6E",
    soft: "#ECFDF5",
  },
  {
    key: "businessOwner",
    icon: "🏪",
    label: "Business Owner",
    hint: "Manage your shop & orders",
    route: "/(auth)/business-owner-login",
    accent: "#16A34A",
    soft: "#F0FDF4",
  },
  {
    key: "deliveryPartner",
    icon: "🛵",
    label: "Delivery Partner",
    hint: "Deliver orders & collect payment",
    route: "/(auth)/delivery-partner-login",
    accent: "#0891B2",
    soft: "#ECFEFF",
  },
];

interface LoginRoleSwitcherProps {
  /** Role currently shown on this login screen */
  currentRole: LoginRoleOption;
  /** Optional compact mode for secondary screens */
  compact?: boolean;
}

/**
 * Clear role picker so users can switch between Resident, Business Owner,
 * and Delivery Partner without hunting for tiny footer links.
 */
export default function LoginRoleSwitcher({
  currentRole,
  compact = false,
}: LoginRoleSwitcherProps) {
  const alternatives = ROLES.filter((role) => role.key !== currentRole);
  const current = ROLES.find((role) => role.key === currentRole)!;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        {compact ? "Switch account type" : "Who are you signing in as?"}
      </Text>
      <Text style={styles.subheading}>
        Currently: {current.label}. Tap another option if this isn’t you.
      </Text>

      <View style={styles.grid}>
        {alternatives.map((role) => (
          <TouchableOpacity
            key={role.key}
            style={[
              styles.card,
              compact ? styles.cardCompact : null,
              { backgroundColor: role.soft, borderColor: role.accent + "33" },
            ]}
            onPress={() => router.replace(role.route as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Sign in as ${role.label}`}
          >
            <Text style={styles.cardIcon}>{role.icon}</Text>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: role.accent }]}>{role.label}</Text>
              {!compact ? <Text style={styles.cardHint}>{role.hint}</Text> : null}
            </View>
            <Text style={[styles.chevron, { color: role.accent }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 0,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subheading: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 17,
  },
  grid: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardCompact: {
    paddingVertical: 12,
  },
  cardIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  cardHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 8,
  },
});
