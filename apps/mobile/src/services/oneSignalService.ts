/**
 * OneSignalService
 *
 * Centralized wrapper for all OneSignal SDK interactions.
 */
import { OneSignal, LogLevel } from "react-native-onesignal";
import {
  extractNotificationData,
  getNotificationActionId,
  getOwnerNewOrderPresentation,
  handleNotificationOpen,
  presentOwnerNewOrderNotification,
  queueOrderNavigation,
} from "./orderNotificationService";

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? "";
const APP_TARGET = process.env.EXPO_PUBLIC_APP_TARGET;

let _verificationDialogShown = false;
let _initialized = false;

function isRegistered(subscriptionId: string | null | undefined): boolean {
  return !!subscriptionId && !subscriptionId.startsWith("local-");
}

function maybeShowVerificationDialog(subscriptionId: string | null | undefined): void {
  if (isRegistered(subscriptionId) && !_verificationDialogShown) {
    _verificationDialogShown = true;
  }
}

function logOneSignalState(message: string, data?: unknown): void {
  console.log(`[OneSignal] ${message}`, data ?? "");
}

export const OneSignalService = {
  initialize(): void {
    if (_initialized) return;
    if (!APP_ID) {
      console.warn("[OneSignal] EXPO_PUBLIC_ONESIGNAL_APP_ID is not set — skipping init");
      return;
    }

    _initialized = true;

    OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn);

    OneSignal.initialize(APP_ID);
    this.setupPushSubscriptionVerification();
    this.setupForegroundDisplay();
    this.setupClickHandler();

    try {
      OneSignal.Notifications.requestPermission(true).then((granted: boolean) => {
        logOneSignalState(`permission ${granted ? "granted" : "denied"}`);
      }).catch((error: unknown) => {
        console.warn("[OneSignal] permission request failed", error);
      });
    } catch (error) {
      console.warn("[OneSignal] permission request error", error);
    }
  },

  setupPushSubscriptionVerification(): void {
    OneSignal.User.pushSubscription.addEventListener("change", (subscription) => {
      maybeShowVerificationDialog(subscription.current.id);
    });

    OneSignal.User.pushSubscription
      .getIdAsync()
      .then(maybeShowVerificationDialog)
      .catch(() => null);
  },

  setupForegroundDisplay(): void {
    try {
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
        if (APP_TARGET !== "businessOwner") return;

        const presentation = getOwnerNewOrderPresentation(event?.notification);
        if (!presentation) return;

        // Suppress OneSignal's simplified foreground banner (default sound, no buttons).
        if (typeof event.preventDefault === "function") {
          event.preventDefault(true);
        }

        void presentOwnerNewOrderNotification(
          presentation.title,
          presentation.body,
          presentation.data
        );
      });
    } catch (error) {
      console.warn("[OneSignal] foreground display setup failed", error);
    }
  },

  setupClickHandler(): void {
    try {
      OneSignal.Notifications.addEventListener("click", (event: any) => {
        const data = extractNotificationData(event?.notification);
        const actionId = getNotificationActionId(event?.result, data);
        queueOrderNavigation(actionId, data);
        void handleNotificationOpen(actionId, data);
      });
    } catch (error) {
      console.warn("[OneSignal] click handler setup failed", error);
    }
  },

  login(userId: string, metadata?: { role?: string; businessId?: string }): void {
    if (!APP_ID) return;
    OneSignal.login(userId);
    try {
      const anyOneSignal = OneSignal as any;
      if (typeof anyOneSignal.setExternalUserId === "function") {
        anyOneSignal.setExternalUserId(userId);
      } else if (typeof anyOneSignal.setExternalId === "function") {
        anyOneSignal.setExternalId(userId);
      }

      if (metadata?.role || metadata?.businessId) {
        const tags: Record<string, string> = {};
        if (metadata.role) tags.role = metadata.role;
        if (metadata.businessId) tags.businessId = metadata.businessId;
        if (Object.keys(tags).length > 0 && typeof OneSignal.User.addTags === "function") {
          OneSignal.User.addTags(tags);
        }
      }
    } catch (err) {
      console.warn("[OneSignal] setExternalUserId unavailable", err);
    }
  },

  logout(): void {
    if (!APP_ID) return;
    OneSignal.logout();
    try {
      const anyOneSignal = OneSignal as any;
      if (typeof anyOneSignal.removeExternalUserId === "function") {
        anyOneSignal.removeExternalUserId();
      } else if (typeof anyOneSignal.setExternalUserId === "function") {
        anyOneSignal.setExternalUserId("");
      }
    } catch (err) {
      console.warn("[OneSignal] removeExternalUserId unavailable", err);
    }
  },

  setEmail(email: string): void {
    if (!APP_ID) return;
    OneSignal.User.addEmail(email);
  },

  removeEmail(email: string): void {
    if (!APP_ID) return;
    OneSignal.User.removeEmail(email);
  },
};
