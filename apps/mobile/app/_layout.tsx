import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { ToastProvider } from "react-native-toast-notifications";
import { store } from "../src/store/index";
import { useAppDispatch, useAppSelector } from "../src/hooks/useRedux";
import { logout, setAuth, setHydrated } from "../src/store/slices/authSlice";
import { authStateService } from "../src/services/authStateService";
import { authService } from "../src/services/authService";
import { colors } from "../src/constants/theme";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isHydrated = useAppSelector((state) => state.auth.isHydrated);

  useEffect(() => {
    const hydrate = async () => {
      const persisted = await authStateService.loadAuth();
      if (persisted) {
        dispatch(setAuth(persisted));

        try {
          const me = await authService.getCurrentUser();
          if (me?.data) {
            const refreshed = { user: me.data, tokens: persisted.tokens };
            await authStateService.saveAuth(refreshed);
            dispatch(setAuth(refreshed));
          }
        } catch {
          await authStateService.clearAuth();
          dispatch(logout());
        }
      }
      dispatch(setHydrated(true));
    };

    hydrate();
  }, [dispatch]);

  if (!isHydrated) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={colors.blue[500]} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthBootstrap>
        <ToastProvider placement="top" duration={2500} animationType="slide-in">
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </AuthBootstrap>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
