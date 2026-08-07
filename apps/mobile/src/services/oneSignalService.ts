/**
 * OneSignalService
 *
 * Centralized wrapper for all OneSignal SDK interactions.
 * Platforms: iOS (APNs) + Android (FCM via OneSignal).
 *
 * Important: do NOT call preventDefault on foregroundWillDisplay unless you
 * immediately re-display. Suppressing without a guaranteed present kills
 * banners on iOS (including Simulator).
 */
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OneSignal, LogLevel } from "react-native-onesignal";
import {
  extractNotificationData,
  getNotificationActionId,
  handleNotificationOpen,
  queueOrderNavigation,
} from "./orderNotificationService";

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? "";
const VERIFICATION_SHOWN_KEY = "@onesignal/verification_dialog_shown";

let _verificationDialogShown = false;
let _initialized = false;

/** Retained so OneSignal's weakly-held subscription observer is not GC'd. */
const _pushSubscriptionObserver = {
  onChange(subscription: { current?: { id?: string | null } }) {
    void OneSignalService.maybeShowVerificationDialog(subscription.current?.id);
  },
};

function isRegistered(subscriptionId: string | null | undefined): boolean {
  return !!subscriptionId && !subscriptionId.startsWith("local-");
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
    this.setupClickHandler();

    // Request OS permission immediately so remote + local alerts can display
    // on Simulator and device (foreground and background).
    void this.requestPermission().then((granted) => {
      logOneSignalState(`init permission ${granted ? "granted" : "denied"}`);
      void this.logSubscriptionState();
    });
  },

  async logSubscriptionState(): Promise<void> {
    try {
      const id = await OneSignal.User.pushSubscription.getIdAsync();
      const token = await OneSignal.User.pushSubscription.getTokenAsync();
      const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
      logOneSignalState("subscription", { id, token: token ? `${String(token).slice(0, 12)}…` : null, optedIn });
    } catch (error) {
      console.warn("[OneSignal] subscription state read failed", error);
    }
  },

  setupPushSubscriptionVerification(): void {
    OneSignal.User.pushSubscription.addEventListener("change", _pushSubscriptionObserver.onChange);

    OneSignal.User.pushSubscription
      .getIdAsync()
      .then((id) => this.maybeShowVerificationDialog(id))
      .catch(() => null);
  },

  async maybeShowVerificationDialog(subscriptionId: string | null | undefined): Promise<void> {
    if (!isRegistered(subscriptionId) || _verificationDialogShown) return;

    try {
      const alreadyShown = await AsyncStorage.getItem(VERIFICATION_SHOWN_KEY);
      if (alreadyShown === "1") {
        _verificationDialogShown = true;
        return;
      }
    } catch {
      /* show once this session */
    }

    _verificationDialogShown = true;
    this.showIntegrationCompleteDialog();
  },

  showIntegrationCompleteDialog(): void {
    Alert.alert(
      "Your OneSignal SDK integration is complete!",
      "You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.",
      [
        {
          text: "Got it",
          onPress: () => {
            void AsyncStorage.setItem(VERIFICATION_SHOWN_KEY, "1").catch(() => null);
            void this.requestPermission();
          },
        },
      ],
      { cancelable: false }
    );
  },

  async requestPermission(): Promise<boolean> {
    if (!APP_ID) return false;
    try {
      const granted = await OneSignal.Notifications.requestPermission(true);
      logOneSignalState(`permission ${granted ? "granted" : "denied"}`);
      if (granted) {
        try {
          OneSignal.User.pushSubscription.optIn();
        } catch {
          /* older SDK builds may not expose optIn */
        }
      }
      return granted;
    } catch (error) {
      console.warn("[OneSignal] permission request failed", error);
      return false;
    }
  },

  async ensurePermission(): Promise<void> {
    if (!APP_ID) return;
    try {
      const anyNotifications = OneSignal.Notifications as any;
      if (typeof anyNotifications.getPermissionAsync === "function") {
        const hasPermission = await anyNotifications.getPermissionAsync();
        if (hasPermission) {
          try {
            OneSignal.User.pushSubscription.optIn();
          } catch {
            /* ignore */
          }
          return;
        }
      }
      await this.requestPermission();
    } catch {
      await this.requestPermission();
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
    void this.ensurePermission().then(() => this.logSubscriptionState());
    try {
      if (metadata?.role || metadata?.businessId) {
        const tags: Record<string, string> = {};
        if (metadata.role) tags.role = metadata.role;
        if (metadata.businessId) tags.businessId = metadata.businessId;
        if (Object.keys(tags).length > 0 && typeof OneSignal.User.addTags === "function") {
          OneSignal.User.addTags(tags);
        }
      }
    } catch (err) {
      console.warn("[OneSignal] tag update failed", err);
    }
  },

  logout(): void {
    if (!APP_ID) return;
    OneSignal.logout();
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
