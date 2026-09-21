import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { brand, fonts } from "../../constants/theme";

interface MmButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "gold" | "forest" | "ghost";
  style?: ViewStyle;
}

export default function MmButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "gold",
  style,
}: MmButtonProps) {
  const isGhost = variant === "ghost";
  const backgroundColor =
    variant === "forest" ? brand.primaryDark : variant === "gold" ? brand.accent : "transparent";
  const textColor = isGhost ? brand.accentDark : "#FFFFFF";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { backgroundColor, opacity: disabled ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  label: {
    fontSize: 16,
    letterSpacing: -0.32,
    fontFamily: fonts.semiBold,
  },
});
