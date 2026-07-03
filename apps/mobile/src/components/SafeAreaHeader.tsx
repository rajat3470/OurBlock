import { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity, Text, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface SafeAreaHeaderProps {
  title: string;
  subtitle?: string;
  colors?: readonly [string, string, ...string[]];
  backgroundColor?: string;
  textColor?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: ReactNode;
  style?: ViewStyle;
  statusBarStyle?: "light-content" | "dark-content";
}

/**
 * SafeAreaHeader - A header component that handles notch/device safe areas
 * 
 * This component ensures header content is not hidden behind the notch.
 * Supports gradient backgrounds and optional back button.
 * 
 * @example
 * <SafeAreaHeader
 *   title="Orders"
 *   subtitle="Track and fulfill customer orders"
 *   colors={["#16A34A", "#0A7D55"]}
 *   showBackButton
 *   onBackPress={() => router.back()}
 * />
 */
export default function SafeAreaHeader({
  title,
  subtitle,
  colors,
  backgroundColor,
  textColor = "#FFFFFF",
  showBackButton = false,
  onBackPress,
  rightComponent,
  style,
  statusBarStyle = "light-content",
}: SafeAreaHeaderProps) {
  const insets = useSafeAreaInsets();

  const headerStyle = [
    styles.header,
    {
      paddingTop: insets.top + 12,
      paddingBottom: 16,
    },
    style,
  ];

  const content = (
    <View style={styles.headerContent}>
      {showBackButton && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
      )}

      <View style={[styles.titleContainer, !showBackButton && !rightComponent && styles.titleContainerCenter]}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: `${textColor}CC` }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
      {!rightComponent && showBackButton && <View style={styles.spacer} />}
    </View>
  );

  if (colors) {
    return (
      <>
        <StatusBar barStyle={statusBarStyle} backgroundColor={colors[0]} />
        <LinearGradient colors={colors} style={headerStyle}>
          {content}
        </LinearGradient>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      <View style={[headerStyle, { backgroundColor }]}>{content}</View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
  },
  titleContainerCenter: {
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  rightComponent: {
    alignItems: "flex-end",
  },
  spacer: {
    width: 40,
  },
});
