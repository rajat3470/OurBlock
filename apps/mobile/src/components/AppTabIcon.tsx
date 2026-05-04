import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { roleTheme, radius } from "../constants/theme";

interface AppTabIconProps {
  emoji: string;
  focused: boolean;
  role: "superAdmin" | "businessOwner" | "user";
}

export default function AppTabIcon({ emoji, focused, role }: AppTabIconProps) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused ? { backgroundColor: roleTheme[role].soft } : null,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 20,
  },
});
