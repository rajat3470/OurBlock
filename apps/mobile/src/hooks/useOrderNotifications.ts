/**
 * useOrderNotifications
 *
 * Handles:
 * 1. FCM push token registration + persistence to Firestore via API
 * 2. Foreground message listener → local notification with custom sound + actions
 * 3. Background/quit tap handler → navigates to the relevant order
 *
 * OneSignal click handling is registered globally via initOrderNotificationHandlers().
 */
import { useEffect } from "react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useAppSelector } from "./useRedux";
import {
  handleNotificationOpen,
  isOwnerNewOrderNotification,
  presentOwnerNewOrderNotification,
  queueOrderNavigation,
} from "@services/orderNotificationService";

const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

let _messagingCache: any = undefined;

const getMessaging = (): any => {
  if (IS_EXPO_GO) return null;
  if (_messagingCache !== undefined) return _messagingCache;
  try {
    const mod = require("@react-native-firebase/messaging").default;
    mod();
    _messagingCache = mod;
  } catch {
    _messagingCache = null;
  }
  return _messagingCache;
};

const APP_TARGET = process.env.EXPO_PUBLIC_APP_TARGET;

export function useOrderNotifications() {
  const { tokens } = useAppSelector((s) => s.auth);
  const accessToken = tokens?.accessToken;

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

        const { apiClient } = await import("@services/apiClient");
        await apiClient.post("/users/fcm-token", { fcmToken }).catch(() => null);
      } catch {
        // Non-fatal
      }
    };

    registerToken();

    const unsubRefresh = m().onTokenRefresh(async (newToken: string) => {
      const { apiClient } = await import("@services/apiClient");
      await apiClient.post("/users/fcm-token", { fcmToken: newToken }).catch(() => null);
    });

    return () => unsubRefresh();
  }, [accessToken]);

  useEffect(() => {
    const m = getMessaging();
    if (!m) return;

    const unsubForeground = m().onMessage(async (remoteMessage: any) => {
      const { notification, data } = remoteMessage;
      if (!notification) return;

      const payload = (data ?? {}) as Record<string, unknown>;

      if (APP_TARGET === "businessOwner" && isOwnerNewOrderNotification(payload)) {
        await presentOwnerNewOrderNotification(
          notification.title ?? "New Order",
          notification.body ?? "",
          payload
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title ?? "mohallaMitr",
          body: notification.body ?? "",
          data: Object.fromEntries(
            Object.entries(payload).map(([key, value]) => [key, String(value ?? "")])
          ),
          sound: "default",
        },
        trigger: null,
      });
    });

    return () => unsubForeground();
  }, []);

  useEffect(() => {
    const m = getMessaging();
    if (!m) return;

    const openFromNotification = (remoteMessage: any) => {
      const data = remoteMessage?.data as Record<string, unknown> | undefined;
      if (!data?.orderId) return;
      queueOrderNavigation(undefined, data);
      void handleNotificationOpen(undefined, data);
    };

    m().onNotificationOpenedApp(openFromNotification);

    m()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage?.data?.orderId) {
          setTimeout(() => openFromNotification(remoteMessage), 1000);
        }
      });
  }, []);
}
