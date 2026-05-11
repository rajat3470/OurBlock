import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../constants/theme";

interface UserTabIconProps {
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}

export default function UserTabIcon({ iconName, focused }: UserTabIconProps) {
  if (focused) {
    return (
      <LinearGradient colors={["#DC2626", "#111111"]} style={[styles.focusedWrap, { marginBottom: 4 }]}>
        <Ionicons name={iconName} size={20} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.iconWrap, { marginBottom: 4 }]}>
      <Ionicons name={iconName} size={20} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  focusedWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
});
