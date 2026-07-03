import { PropsWithChildren } from "react";
import { View, StyleSheet, ViewStyle, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SafeAreaScreenProps extends PropsWithChildren {
  style?: ViewStyle;
  backgroundColor?: string;
  statusBarStyle?: "light-content" | "dark-content";
  statusBarBackgroundColor?: string;
}

/**
 * SafeAreaScreen - A wrapper component that handles notch/device safe areas
 * 
 * This component ensures content is not hidden behind the notch or home indicator.
 * Use this as the root wrapper for all screens to ensure consistent safe area handling.
 * 
 * @example
 * <SafeAreaScreen backgroundColor="#F7F8FA">
 *   <YourContent />
 * </SafeAreaScreen>
 */
export default function SafeAreaScreen({
  children,
  style,
  backgroundColor = "#F7F8FA",
  statusBarStyle = "dark-content",
  statusBarBackgroundColor,
}: SafeAreaScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackgroundColor || backgroundColor}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
          style,
        ]}
      >
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
