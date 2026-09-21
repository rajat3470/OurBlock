import { ReactNode } from "react";
import { StatusBar, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brand } from "../../constants/theme";
import MmBackButton from "./MmBackButton";

interface MmScreenProps {
  children: ReactNode;
  backgroundColor?: string;
  statusBarStyle?: "light-content" | "dark-content";
  showBack?: boolean;
  onBack?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export default function MmScreen({
  children,
  backgroundColor = brand.cream,
  statusBarStyle = "dark-content",
  showBack = false,
  onBack,
  style,
  contentStyle,
}: MmScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor, paddingTop: insets.top }, style]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      {showBack ? (
        <View style={styles.backRow}>
          <MmBackButton onPress={onBack} />
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backRow: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
