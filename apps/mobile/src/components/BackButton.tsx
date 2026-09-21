import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { iconArrowLeftXml } from "./ui/iconArrowLeftXml";

interface BackButtonProps {
  top?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function BackButton({ top = 8, onPress, style }: BackButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.button, { top: top + insets.top }, style]}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/(auth)/welcome")))}
      activeOpacity={0.8}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <SvgXml xml={iconArrowLeftXml} width={24} height={24} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 12,
    zIndex: 30,
    width: 40,
    height: 42,
    borderRadius: 1000,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
