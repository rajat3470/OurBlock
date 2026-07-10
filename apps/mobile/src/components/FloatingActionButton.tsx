import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/theme";

interface FloatingActionButtonProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  iconColor?: string;
  style?: ViewStyle;
}

export default function FloatingActionButton({
  icon = "add",
  onPress,
  color = brand.primary,
  iconColor = "#FFFFFF",
  style,
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: color, shadowColor: color }, style]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={28} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
