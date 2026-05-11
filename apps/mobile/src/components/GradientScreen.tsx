import { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getRoleGradient, gradients, type AppRoleTheme } from "../constants/theme";

interface GradientScreenProps extends PropsWithChildren {
  role?: AppRoleTheme;
  style?: ViewStyle;
}

export default function GradientScreen({ role, style, children }: GradientScreenProps) {
  const colors = role ? getRoleGradient(role) : gradients.appBackground;

  return (
    <LinearGradient colors={colors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, style]}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
