/**
 * Shared helpers for order push notification handling (OneSignal + FCM + Expo).
 */
import { Platform, Vibration } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { OrderStatus } from "@/types";

export const NEW_ORDER_SOUND_IOS = "new_order_alert.wav";
export const NEW_ORDER_SOUND_ANDROID = "new_order_alert";
export const ORDER_REVIEW_CATEGORY = "ORDER_REVIEW";
export const ACTION_ACCEPT = "accept_order";
export const ACTION_REJECT = "reject_order";
export const ANDROID_ORDERS_CHANNEL_ID = "orders";

const APP_TARGET = process.env.EXPO_PUBLIC_APP_TARGET;

let _player: AudioPlayer | null = null;
let _handlersInitialized = false;

type PendingNavigation = {
  pathname: string;
  params?: Record<string, string>;
};

let _pendingNavigation: PendingNavigation | null = null;

export function setPendingOrderNavigation(pathname: string, params?: Record<string, string>): void {
  _pendingNavigation = { pathname, params };
}

export function consumePendingOrderNavigation(): PendingNavigation | null {
  const pending = _pendingNavigation;
  _pendingNavigation = null;
  return pending;
}

export function queueOrderNavigation(
  actionId: string | undefined,
  data: Record<string, unknown> | undefined
): void {
  const orderId = typeof data?.orderId === "string" ? data.orderId : undefined;
  if (!orderId || APP_TARGET !== "businessOwner") return;

  const resolvedActionId = getNotificationActionId(
    actionId ? { actionId } : undefined,
    data
  );

  if (resolvedActionId === ACTION_REJECT) {
    setPendingOrderNavigation("/(business-owner)/orders", { rejectOrderId: orderId });
    return;
  }

  setPendingOrderNavigation("/(business-owner)/orders");
}

function normalizeData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      result[key] = value;
      continue;
    }
    result[key] = String(value);
  }
  return result;
}

/** Extract custom data from OneSignal / FCM notification payloads. */
export function extractNotificationData(notification: any): Record<string, unknown> {
  const candidates = [
    notification?.additionalData,
    notification?.additional_data,
    notification?.data,
    notification?.rawPayload?.custom?.a,
    notification?.rawPayload?.a,
    notification?.rawPayload?.custom,
    notification?.rawPayload?.additionalData,
    notification?.request?.content?.data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object") {
          return normalizeData(parsed as Record<string, unknown>);
        }
      } catch {
        // OneSignal sometimes passes flat string maps
        continue;
      }
      continue;
    }
    if (typeof candidate === "object") {
      const normalized = normalizeData(candidate as Record<string, unknown>);
      if (Object.keys(normalized).length > 0) {
        return normalized;
      }
    }
  }

  return {};
}

export function getOwnerNewOrderPresentation(
  notification: any
): { title: string; body: string; data: Record<string, unknown> } | null {
  const data = extractNotificationData(notification);
  if (!isOwnerNewOrderNotification(data)) return null;

  const title =
    notification?.title ??
    notification?.rawPayload?.title ??
    "🔔 New Order!";
  const body =
    notification?.body ??
    notification?.rawPayload?.alert ??
    notification?.rawPayload?.body ??
    "You have a new order waiting for review.";

  return { title, body, data };
}

export function isOwnerNewOrderNotification(
  data: Record<string, unknown> | undefined
): boolean {
  return (
    data?.action === "review" &&
    data?.status === "pending" &&
    typeof data?.orderId === "string" &&
    data.orderId.length > 0
  );
}

export function getNotificationActionId(
  result: { actionId?: string; actionID?: string } | undefined,
  data?: Record<string, unknown>
): string | undefined {
  const fromResult = result?.actionId ?? result?.actionID;
  if (fromResult) return fromResult;

  const selected = data?.actionSelected;
  if (typeof selected === "string" && selected.length > 0) {
    return selected;
  }

  return undefined;
}

export async function playNewOrderSound(): Promise<void> {
  try {
    _player?.release();
    _player = null;

    await setAudioModeAsync({ playsInSilentMode: true });

    const player = createAudioPlayer(require("../../assets/audio/new_order_alert.wav"));
    _player = player;
    player.play();

    setTimeout(() => {
      if (_player === player) {
        player.release();
        _player = null;
      }
    }, 15000);
  } catch {
    // Non-fatal — vibration still alerts the user
  }
}

function playNewOrderAlert() {
  Vibration.vibrate([0, 400, 200, 400, 200, 600]);
}

/** Show a local notification that mirrors background behavior (sound + action buttons). */
export async function presentOwnerNewOrderNotification(
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    console.warn("[Notifications] permission not granted — cannot present local order alert");
    return;
  }

  playNewOrderAlert();

  const payload = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)])
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: payload,
      sound: getOrderNotificationSound(),
      categoryIdentifier: ORDER_REVIEW_CATEGORY,
      ...(Platform.OS === "android"
        ? { android: { channelId: ANDROID_ORDERS_CHANNEL_ID } }
        : {}),
    },
    trigger: null,
  });
}

export async function handleOrderNotificationAction(
  actionId: string | undefined,
  data: Record<string, unknown> | undefined,
  onAccepted?: () => void
): Promise<void> {
  const orderId = typeof data?.orderId === "string" ? data.orderId : undefined;
  const resolvedActionId = getNotificationActionId(
    actionId ? { actionId } : undefined,
    data
  );

  queueOrderNavigation(resolvedActionId ?? actionId, data);

  if (APP_TARGET === "businessOwner" && orderId) {
    if (resolvedActionId === ACTION_ACCEPT) {
      try {
        const { businessOwnerService } = await import("./businessOwnerService");
        await businessOwnerService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);
        onAccepted?.();
      } catch {
        // User can accept from the orders screen if this fails
      }
      router.replace("/(business-owner)/orders");
      return;
    }

    if (resolvedActionId === ACTION_REJECT) {
      router.replace({
        pathname: "/(business-owner)/orders",
        params: { rejectOrderId: orderId },
      });
      return;
    }
  }

  if (orderId) {
    if (APP_TARGET === "businessOwner") {
      router.replace("/(business-owner)/orders");
    } else {
      router.replace("/(user)/(tabs)/orders");
    }
  }
}

export async function handleNotificationOpen(
  actionId: string | undefined,
  data: Record<string, unknown> | undefined,
  onAccepted?: () => void
): Promise<void> {
  queueOrderNavigation(actionId, data);

  // Wait for auth hydration / router mount on cold start.
  await new Promise((resolve) => setTimeout(resolve, 900));
  await handleOrderNotificationAction(actionId, data, onAccepted);
}

/** Register Expo local-notification tap handlers once at app startup. */
export function initOrderNotificationHandlers(onAccepted?: () => void): void {
  if (_handlersInitialized) return;
  _handlersInitialized = true;

  Notifications.addNotificationResponseReceivedListener((response) => {
    const content = response.notification.request.content;
    const data = (content.data ?? {}) as Record<string, unknown>;
    const actionIdentifier = response.actionIdentifier;

    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      void handleNotificationOpen(undefined, data, onAccepted);
      return;
    }

    if (actionIdentifier === ACTION_ACCEPT || actionIdentifier === ACTION_REJECT) {
      void handleNotificationOpen(actionIdentifier, data, onAccepted);
    }
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    const content = response.notification.request.content;
    const data = (content.data ?? {}) as Record<string, unknown>;
    if (!isOwnerNewOrderNotification(data)) return;

    const actionIdentifier = response.actionIdentifier;
    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      void handleNotificationOpen(undefined, data, onAccepted);
      return;
    }
    if (actionIdentifier === ACTION_ACCEPT || actionIdentifier === ACTION_REJECT) {
      void handleNotificationOpen(actionIdentifier, data, onAccepted);
    }
  });
}

export function getOrderNotificationSound(): string | boolean {
  if (Platform.OS === "ios") return NEW_ORDER_SOUND_IOS;
  return true;
}
