import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, fonts } from "../constants/theme";

interface AppSectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export default function AppSectionHeader({
  title,
  subtitle,
  badge,
}: AppSectionHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.serif,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.forest[100],
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(11,46,34,0.18)",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});
