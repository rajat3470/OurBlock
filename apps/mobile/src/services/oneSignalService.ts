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

function logOneSignalState(message: string, data?: unknown): void {
  console.log(`[OneSignal] ${message}`, data ?? "");
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
    this.setupForegroundDisplay();

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

  setupForegroundDisplay(): void {
    try {
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
        event.preventDefault();
        event.notification.display();
      });
    } catch (error) {
      console.warn("[OneSignal] foreground display setup failed", error);
    }
  },

  /**
   * Associate the signed-in user with their OneSignal profile.
   * Call after a successful login, once the user ID is known.
   */
  login(userId: string, metadata?: { role?: string; businessId?: string }): void {
    if (!APP_ID) return;
    OneSignal.login(userId);
    // Also set the OneSignal external user id when available so server sends
    // can target `include_external_user_ids` using our app user id.
    try {
      const anyOneSignal = OneSignal as any;
      if (typeof anyOneSignal.setExternalUserId === 'function') {
        anyOneSignal.setExternalUserId(userId);
      } else if (typeof anyOneSignal.setExternalId === 'function') {
        anyOneSignal.setExternalId(userId);
      }

      if (metadata?.role || metadata?.businessId) {
        const tags: Record<string, string> = {};
        if (metadata.role) tags.role = metadata.role;
        if (metadata.businessId) tags.businessId = metadata.businessId;
        if (Object.keys(tags).length > 0 && typeof OneSignal.User.addTags === 'function') {
          OneSignal.User.addTags(tags);
        }
      }
    } catch (err) {
      // Non-fatal — older SDKs may not support the call
      console.warn('[OneSignal] setExternalUserId unavailable', err);
    }
  },

  /**
   * Disassociate the user from their OneSignal profile.
   * Call on logout so notifications are no longer delivered to this device.
   */
  logout(): void {
    if (!APP_ID) return;
    OneSignal.logout();
    try {
      const anyOneSignal = OneSignal as any;
      if (typeof anyOneSignal.removeExternalUserId === 'function') {
        anyOneSignal.removeExternalUserId();
      } else if (typeof anyOneSignal.setExternalUserId === 'function') {
        // clear external id
        anyOneSignal.setExternalUserId('');
      }
    } catch (err) {
      console.warn('[OneSignal] removeExternalUserId unavailable', err);
    }
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
