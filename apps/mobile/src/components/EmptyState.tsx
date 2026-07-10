import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  style?: ViewStyle;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  iconColor = "#FFFFFF",
  iconBackgroundColor = brand.primary,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={40} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 60,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
});
