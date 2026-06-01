import { useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet, Text, TextInput, AppState } from "react-native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { ToastProvider } from "react-native-toast-notifications";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from "@expo-google-fonts/poppins";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { store } from "../src/store/index";
import { useAppDispatch, useAppSelector } from "../src/hooks/useRedux";
import { logout, setAuth, setHydrated } from "../src/store/slices/authSlice";
import { authStateService } from "../src/services/authStateService";
import { authService } from "../src/services/authService";
import { apiClient } from "../src/services/apiClient";
import { featureFlagsService } from "../src/services/featureFlagsService";
import { setFeatureFlagsError, setFlags, setRefreshing } from "../src/store/slices/featureFlagsSlice";
import { initializeMobileAds } from "../src/services/adService";
import { colors } from "../src/constants/theme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulator — skip
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;
  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isHydrated = useAppSelector((state) => state.auth.isHydrated);
  const authUser = useAppSelector((state) => state.auth.user);
  const adsEnabled = useAppSelector((state) => state.featureFlags.values.adsEnabled);
  const adsSdkInitialized = useRef(false);

  // Initialize the Google Mobile Ads SDK once, only when the master ads flag is on.
  useEffect(() => {
    if (!adsEnabled || adsSdkInitialized.current) return;
    adsSdkInitialized.current = true;
    initializeMobileAds().catch(() => { /* non-blocking — app works without ads */ });
  }, [adsEnabled]);

  useEffect(() => {
    let mounted = true;

    const syncFlags = async (refresh = false) => {
      dispatch(setRefreshing(true));
      try {
        const snapshot = refresh
          ? await featureFlagsService.refresh()
          : await featureFlagsService.initialize();
        if (!mounted) return;
        dispatch(setFlags(snapshot));
        dispatch(setFeatureFlagsError(null));
      } catch (error: any) {
        if (!mounted) return;
        dispatch(setFeatureFlagsError(error?.message || "Failed to sync feature flags"));
      } finally {
        if (mounted) dispatch(setRefreshing(false));
      }
    };

    syncFlags(false);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncFlags(true);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [dispatch]);

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

  // Register push token once authenticated
  useEffect(() => {
    if (!authUser) return;
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          apiClient.put("/auth/push-token", { pushToken: token }).catch(() => { /* non-blocking */ });
        }
      })
      .catch(() => { /* non-blocking */ });
  }, [authUser?.id]);


  if (!isHydrated) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={process.env.EXPO_PUBLIC_APP_TARGET === "user" ? colors.red[600] : colors.blue[500]} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    const appTarget = process.env.EXPO_PUBLIC_APP_TARGET;
    if (appTarget !== "user" || !fontsLoaded) return;

    const TextAny = Text as any;
    const TextInputAny = TextInput as any;
    TextAny.defaultProps = {
      ...(TextAny.defaultProps ?? {}),
      style: [{ fontFamily: "Poppins_400Regular" }, TextAny.defaultProps?.style],
    };
    TextInputAny.defaultProps = {
      ...(TextInputAny.defaultProps ?? {}),
      style: [{ fontFamily: "Poppins_400Regular" }, TextInputAny.defaultProps?.style],
    };
  }, [fontsLoaded]);

  if (!fontsLoaded && process.env.EXPO_PUBLIC_APP_TARGET === "user") {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={colors.red[600]} />
      </View>
    );
  }

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
