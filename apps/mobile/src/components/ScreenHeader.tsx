import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/theme";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  colors?: readonly [string, string, ...string[]];
  right?: ReactNode;
  style?: ViewStyle;
}

/**
 * Gradient screen header with a circular back button and a centered title.
 * Matches the customer ("user") app header style.
 */
export default function ScreenHeader({
  title,
  onBack,
  colors = brand.heroGradient,
  right,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors}
      style={[styles.header, { paddingTop: insets.top + 12 }, style]}
    >
      {onBack ? (
        <TouchableOpacity style={styles.sideBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {right ? <View style={styles.sideBtn}>{right}</View> : <View style={styles.sideBtn} />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sideBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
