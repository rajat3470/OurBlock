import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brand, colors, fonts } from "@/constants/theme";
import MmBackButton from "./ui/MmBackButton";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  colors?: readonly [string, string, ...string[]];
  right?: ReactNode;
  style?: ViewStyle;
}

export default function ScreenHeader({
  title,
  onBack,
  right,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }, style]}>
      {onBack ? <MmBackButton onPress={onBack} /> : <View style={styles.sideBtn} />}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={styles.sideBtn}>{right}</View> : <View style={styles.sideBtn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: brand.cream,
  },
  sideBtn: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: fonts.serif,
    marginHorizontal: 8,
  },
});
