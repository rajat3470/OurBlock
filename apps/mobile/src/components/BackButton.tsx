import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface BackButtonProps {
  /** Extra offset below the safe-area inset */
  top?: number;
  onPress?: () => void;
  /** Override absolute positioning when needed */
  style?: ViewStyle;
}

/**
 * Light frosted back control for auth / colored headers.
 * Avoids the heavy dark pill that clashes with teal/green gradients.
 */
export default function BackButton({ top = 8, onPress, style }: BackButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.button, { top: top + insets.top }, style]}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/(auth)/user-login")))}
      activeOpacity={0.8}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={22} color="#0F172A" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 16,
    zIndex: 30,
    elevation: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
});
