import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const ROLE_GRADIENTS: Record<string, readonly [string, string]> = {
  businessOwner: ["#16A34A", "#0E8A3D"],
  superAdmin: ["#2563EB", "#1D4ED8"],
  user: ["#DC2626", "#991B1B"],
};

interface AppTabIconProps {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  role: "superAdmin" | "businessOwner" | "user";
}

export default function AppTabIcon({ iconName, focused, role }: AppTabIconProps) {
  const [start, end] = ROLE_GRADIENTS[role] ?? ROLE_GRADIENTS.user;

  if (focused) {
    return (
      <LinearGradient
        colors={[start, end]}
        style={styles.iconWrap}
      >
        <Ionicons name={iconName} size={20} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.iconWrap, styles.iconWrapUnfocused]}>
      <Ionicons name={iconName} size={20} color="#9CA3AF" />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapUnfocused: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
