import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius, typography, gradients } from "../constants/theme";

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
    <LinearGradient
      colors={[...gradients.appBackground]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerWrap}
    >
      <View style={styles.header}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: radius.xl,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.subtitle.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "rgba(59,130,246,0.14)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.38)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.blue[500],
  },
});
