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
import { useAppSelector } from "./useRedux";

// Dynamic import guard: @react-native-firebase/messaging may not be available
// in Expo Go web/managed builds — it is available in bare/standalone builds.
let messaging: any = null;
try {
  const _messaging = require("@react-native-firebase/messaging").default;
  // Verify the native module is actually installed by calling once.
  // This throws "firebase.app() not installed" on Android if the native
  // @react-native-firebase/app module isn't linked (e.g. EAS dev client not rebuilt).
  _messaging();
  messaging = _messaging;
} catch {
  // Not available in this environment — push notifications gracefully disabled
  messaging = null;
}

const APP_TARGET = process.env.EXPO_PUBLIC_APP_TARGET; // "user" | "businessOwner"

export function useOrderNotifications() {
  const { tokens } = useAppSelector((s) => s.auth);
  const accessToken = tokens?.accessToken;
  const router = useRouter();
  // No soundRef needed — using vibration only (works in Expo Go & native builds)

  // ── 1. Register FCM token ─────────────────────────────────────────────────
  useEffect(() => {
    if (!messaging || !accessToken) return;

    const registerToken = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const granted =
          authStatus === messaging.AuthorizationStatus?.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus?.PROVISIONAL;

        if (!granted) return;

        const fcmToken = await messaging().getToken();
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
    const unsubRefresh = messaging().onTokenRefresh(async (newToken: string) => {
      const { apiClient } = await import("@services/apiClient");
      await apiClient.post("/users/fcm-token", { fcmToken: newToken }).catch(() => null);
    });

    return () => unsubRefresh();
  }, [accessToken]);

  // ── 2. Foreground notifications ───────────────────────────────────────────
  useEffect(() => {
    if (!messaging) return;

    const unsubForeground = messaging().onMessage(async (remoteMessage: any) => {
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
        notification.title ?? "OurBlock",
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
    if (!messaging) return;

    // Tapped notification while app was in background
    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      if (remoteMessage?.data?.orderId) {
        if (APP_TARGET === "businessOwner") {
          router.push("/(business-owner)/orders");
        } else {
          router.push("/(user)/orders");
        }
      }
    });

    // App opened from a quit state via notification
    messaging()
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
