/**
 * useOrderNotifications
 *
 * Handles:
 * 1. FCM push token registration + persistence to Firestore via API
 * 2. Foreground message listener → in-app alert toast
 * 3. Background/quit tap handler → navigates to the relevant order
 *
 * Usage: Call once inside each role's root layout (_layout.tsx).
 */
import { useEffect } from "react";
import { Alert, Vibration } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAppSelector } from "./useRedux";

// In Expo Go the @react-native-firebase native modules don't exist.
// Guard at the top level so we never attempt to require them.
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

let _messagingCache: any = undefined;

const getMessaging = (): any => {
  if (IS_EXPO_GO) return null;
  if (_messagingCache !== undefined) return _messagingCache;
  try {
    const mod = require("@react-native-firebase/messaging").default;
    // Probe the module — throws if native layer is not linked.
    mod();
    _messagingCache = mod;
  } catch {
    _messagingCache = null;
  }
  return _messagingCache;
};

const APP_TARGET = process.env.EXPO_PUBLIC_APP_TARGET; // "user" | "businessOwner"

export function useOrderNotifications() {
  const { tokens } = useAppSelector((s) => s.auth);
  const accessToken = tokens?.accessToken;
  const router = useRouter();
  // No soundRef needed — using vibration only (works in Expo Go & native builds)

  // ── 1. Register FCM token ─────────────────────────────────────────────────
  useEffect(() => {
    const m = getMessaging();
    if (!m || !accessToken) return;

    const registerToken = async () => {
      try {
        const authStatus = await m().requestPermission();
        const granted =
          authStatus === m.AuthorizationStatus?.AUTHORIZED ||
          authStatus === m.AuthorizationStatus?.PROVISIONAL;

        if (!granted) return;

        const fcmToken = await m().getToken();
        if (!fcmToken) return;

        // Persist token to backend so server can send targeted pushes
        const { apiClient } = await import("@services/apiClient");
        await apiClient.post("/users/fcm-token", { fcmToken }).catch(() => null);
      } catch {
        // Non-fatal — app works without push, uses in-app polling
      }
    };

    registerToken();

    // Refresh token
    const unsubRefresh = m().onTokenRefresh(async (newToken: string) => {
      const { apiClient } = await import("@services/apiClient");
      await apiClient.post("/users/fcm-token", { fcmToken: newToken }).catch(() => null);
    });

    return () => unsubRefresh();
  }, [accessToken]);

  // ── 2. Foreground notifications ───────────────────────────────────────────
  useEffect(() => {
    const m = getMessaging();
    if (!m) return;

    const unsubForeground = m().onMessage(async (remoteMessage: any) => {
      const { notification, data } = remoteMessage;
      if (!notification) return;

      const isNewOrder =
        APP_TARGET === "businessOwner" &&
        data?.status === "pending";

      if (isNewOrder) {
        // Vibrate alert for business owner (works in Expo Go and native builds)
        playNewOrderAlert();
      }

      // Show in-app alert (since system notification is suppressed while app is open)
      Alert.alert(
        notification.title ?? "mohallaMitr",
        notification.body ?? "",
        [
          { text: "Dismiss", style: "cancel" },
          data?.orderId
            ? {
                text: "View Order",
                onPress: () => {
                  if (APP_TARGET === "businessOwner") {
                    router.push("/(business-owner)/orders");
                  } else {
                    router.push("/(user)/orders");
                  }
                },
              }
            : null,
        ].filter(Boolean) as any
      );
    });

    return () => unsubForeground();
  }, [router]);

  // ── 3. Background / quit tap handler ─────────────────────────────────────
  useEffect(() => {
    const m = getMessaging();
    if (!m) return;

    // Tapped notification while app was in background
    m().onNotificationOpenedApp((remoteMessage: any) => {
      if (remoteMessage?.data?.orderId) {
        if (APP_TARGET === "businessOwner") {
          router.push("/(business-owner)/orders");
        } else {
          router.push("/(user)/orders");
        }
      }
    });

    // App opened from a quit state via notification
    m()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage?.data?.orderId) {
          setTimeout(() => {
            if (APP_TARGET === "businessOwner") {
              router.push("/(business-owner)/orders");
            } else {
              router.push("/(user)/orders");
            }
          }, 1000); // Wait for navigation to mount
        }
      });
  }, [router]);
}

// ── Sound helper ─────────────────────────────────────────────────────────────
function playNewOrderAlert() {
  // Zomato-style short-long-short-long vibration pattern
  Vibration.vibrate([0, 400, 200, 400, 200, 600]);
}
