import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "../constants/theme";

interface AppTabIconProps {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  role: "superAdmin" | "businessOwner" | "user" | "deliveryPartner";
}

export default function AppTabIcon({ iconName, focused }: AppTabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={iconName}
        size={20}
        color={focused ? brand.primaryDark : brand.tabInactive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
