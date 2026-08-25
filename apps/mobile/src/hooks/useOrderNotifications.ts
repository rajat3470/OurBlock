/**
 * useOrderNotifications
 *
 * Handles notification tap → navigates to the relevant order.
 * Push delivery is handled by OneSignal (registered globally via
 * initOrderNotificationHandlers()).
 *
 * This hook only manages:
 * - Expo Notifications response listener (tap on local/delivered notification)
 * - Last notification received while app is in foreground
 */
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import {
  handleNotificationOpen,
  queueOrderNavigation,
} from "@services/orderNotificationService";

export function useOrderNotifications() {
  // Handle notification taps (foreground + background)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (!data?.orderId) return;
        queueOrderNavigation(undefined, data);
        void handleNotificationOpen(undefined, data);
      }
    );

    // Check if app was opened from a killed state via notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (data?.orderId) {
        queueOrderNavigation(undefined, data);
        void handleNotificationOpen(undefined, data);
      }
    });

    return () => subscription.remove();
  }, []);
}
