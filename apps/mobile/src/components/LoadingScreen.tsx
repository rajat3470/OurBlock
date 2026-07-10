import { ActivityIndicator, StyleSheet, View, ViewStyle } from "react-native";
import { brand } from "@/constants/theme";

interface LoadingScreenProps {
  color?: string;
  size?: "small" | "large";
  style?: ViewStyle;
}

export default function LoadingScreen({
  color = brand.primary,
  size = "large",
  style,
}: LoadingScreenProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
  },
});
