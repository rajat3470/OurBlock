/**
 * OneSignalService
 *
 * Centralized wrapper for all OneSignal SDK interactions.
 * No direct OneSignal SDK calls should exist outside this module.
 *
 * Responsibilities:
 * - SDK initialization
 * - User identity (login / logout)
 * - Email subscription
 * - Push subscription verification dialog (required by integration guide)
 */
import { Alert } from "react-native";
import { OneSignal, LogLevel } from "react-native-onesignal";

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? "";

// Guard: show the verification dialog only once per app session
let _verificationDialogShown = false;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A real, server-assigned ID is non-empty and does NOT start with "local-". */
function isRegistered(subscriptionId: string | null | undefined): boolean {
  return !!subscriptionId && !subscriptionId.startsWith("local-");
}

function maybeShowVerificationDialog(subscriptionId: string | null | undefined): void {
  if (isRegistered(subscriptionId) && !_verificationDialogShown) {
    _verificationDialogShown = true;
    // showVerificationDialog();
  }
}

function showVerificationDialog(): void {
  Alert.alert(
    "Your OneSignal SDK integration is complete!",
    "You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.",
    [
      {
        text: "Got it",
        onPress: () => {
          OneSignal.Notifications.requestPermission(true);
        },
      },
    ],
    { cancelable: false }
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export const OneSignalService = {
  /**
   * Initialize the OneSignal SDK and register the push subscription observer.
   * Call once at the root layout level, before rendering app content.
   */
  initialize(): void {
    if (!APP_ID) {
      console.warn("[OneSignal] EXPO_PUBLIC_ONESIGNAL_APP_ID is not set — skipping init");
      return;
    }

    // Use Warn in production, Verbose during development
    OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn);

    OneSignal.initialize(APP_ID);

    this.setupPushSubscriptionVerification();
  },

  /**
   * Register a push subscription observer so the app confirms device registration.
   * Shows a one-time dialog when the subscription ID transitions from local → real.
   * Called internally by initialize() — do not call separately.
   */
  setupPushSubscriptionVerification(): void {
    // React to future subscription ID changes
    OneSignal.User.pushSubscription.addEventListener("change", (subscription) => {
      maybeShowVerificationDialog(subscription.current.id);
    });

    // The ID may already be server-assigned before the listener attaches;
    // evaluate the current value immediately as well.
    OneSignal.User.pushSubscription
      .getIdAsync()
      .then(maybeShowVerificationDialog)
      .catch(() => null);
  },

  /**
   * Associate the signed-in user with their OneSignal profile.
   * Call after a successful login, once the user ID is known.
   */
  login(userId: string): void {
    if (!APP_ID) return;
    OneSignal.login(userId);
  },

  /**
   * Disassociate the user from their OneSignal profile.
   * Call on logout so notifications are no longer delivered to this device.
   */
  logout(): void {
    if (!APP_ID) return;
    OneSignal.logout();
  },

  /**
   * Register an email address for this user (enables email channel in OneSignal).
   */
  setEmail(email: string): void {
    if (!APP_ID) return;
    OneSignal.User.addEmail(email);
  },

  /**
   * Remove a previously registered email address.
   */
  removeEmail(email: string): void {
    if (!APP_ID) return;
    OneSignal.User.removeEmail(email);
  },
};
