import { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getRoleGradient, gradients, type AppRoleTheme } from "../constants/theme";

interface GradientScreenProps extends PropsWithChildren {
  role?: AppRoleTheme;
  style?: ViewStyle;
}

export default function GradientScreen({ role, style, children }: GradientScreenProps) {
  const colors = role ? getRoleGradient(role) : gradients.appBackground;
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={colors} style={styles.gradient}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <View style={[styles.content, style]}>{children}</View>
      </View>
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
