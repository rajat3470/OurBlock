import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAppSelector } from "../src/hooks/useRedux";
import { AppTarget, getDefaultRoute } from "../src/utils/appRouting";
import { colors } from "../src/constants/theme";

export default function IndexScreen() {
  const { isAuthenticated, isHydrated, user } = useAppSelector((state) => state.auth);
  const appTarget = process.env.EXPO_PUBLIC_APP_TARGET as AppTarget;

  useEffect(() => {
    if (!isHydrated) return;

    const timeout = setTimeout(() => {
      router.replace(getDefaultRoute(isAuthenticated, user?.role, appTarget));
    }, 100);

    return () => clearTimeout(timeout);
  }, [appTarget, isAuthenticated, isHydrated, user?.role]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
