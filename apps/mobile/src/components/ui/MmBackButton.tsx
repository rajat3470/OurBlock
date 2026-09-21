import { TouchableOpacity, StyleSheet, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { SvgXml } from "react-native-svg";
import { iconArrowLeftXml } from "./iconArrowLeftXml";

interface MmBackButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
  fallbackRoute?: string;
}

export default function MmBackButton({
  onPress,
  style,
  fallbackRoute = "/(auth)/welcome",
}: MmBackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={
        onPress ??
        (() => (router.canGoBack() ? router.back() : router.replace(fallbackRoute as never)))
      }
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
    width: 40,
    height: 42,
    borderRadius: 1000,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
