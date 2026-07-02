import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { router } from "expo-router";

interface BackButtonProps {
  top?: number;
  onPress?: () => void;
}

export default function BackButton({ top = 12, onPress }: BackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { top }]}
      onPress={onPress ?? (() => router.back())}
      activeOpacity={0.75}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.arrow}>←</Text>
      <Text style={styles.label}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  arrow: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
