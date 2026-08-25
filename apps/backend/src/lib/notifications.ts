import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Push notification helpers — OneSignal (primary) + Expo Push (fallback).
// FCM was dropped as part of the Firebase removal; OneSignal's own SDK layer
// covers Android/iOS delivery on the client side.
// ---------------------------------------------------------------------------

const ONE_SIGNAL_API = "https://onesignal.com/api/v1/notifications";
const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;

export const NEW_ORDER_SOUND_IOS = "new_order_alert.wav";
export const NEW_ORDER_SOUND_ANDROID = "new_order_alert";
export const ANDROID_ORDERS_CHANNEL_ID = "orders";
export const ORDER_ACTION_ACCEPT = "accept_order";
export const ORDER_ACTION_REJECT = "reject_order";

interface OneSignalButton {
  id: string;
  text: string;
}

interface OneSignalPayload {
  include_external_user_ids?: string[];
  headings?: Record<string, string>;
  contents: Record<string, string>;
  data?: Record<string, any>;
  priority?: number;
  ios_sound?: string;
  android_sound?: string;
  existing_android_channel_id?: string;
  url?: string;
  content_available?: boolean;
  mutable_content?: boolean;
  channel_for_external_user_ids?: string;
  buttons?: OneSignalButton[];
}

export async function sendExpoPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: pushToken, sound: "default", title, body, data: data ?? {} }),
    });
  } catch {
    /* non-blocking */
  }
}

export async function sendOneSignalNotification(payload: OneSignalPayload): Promise<any> {
  if (!APP_ID || !API_KEY) return null;
  try {
    const res = await fetch(ONE_SIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${API_KEY}`,
      },
      body: JSON.stringify({ ...payload, app_id: APP_ID }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    return await res.json();
  } catch (err) {
    console.error("[OneSignal] send error", err);
    return { ok: false, error: err };
  }
}

export async function notifyUsersByExternalIds(
  externalUserIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!externalUserIds?.length) return null;
  return sendOneSignalNotification({
    include_external_user_ids: externalUserIds,
    headings: { en: title },
    contents: { en: body },
    data: data ?? {},
    priority: 10,
    ios_sound: "default",
    android_sound: "default",
    content_available: true,
    mutable_content: true,
    channel_for_external_user_ids: "push",
  });
}

/** Owner-only new-order push with custom sound + Accept/Reject action buttons. */
export async function notifyOwnerNewOrder(
  externalUserIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!externalUserIds?.length) return null;
  const payloadData: Record<string, string> = {};
  if (data) for (const [k, v] of Object.entries(data)) payloadData[k] = v == null ? "" : String(v);

  return sendOneSignalNotification({
    include_external_user_ids: externalUserIds,
    headings: { en: title },
    contents: { en: body },
    data: payloadData,
    priority: 10,
    ios_sound: NEW_ORDER_SOUND_IOS,
    android_sound: NEW_ORDER_SOUND_ANDROID,
    existing_android_channel_id: ANDROID_ORDERS_CHANNEL_ID,
    content_available: true,
    mutable_content: true,
    channel_for_external_user_ids: "push",
    url: "mohallamitr://orders",
    buttons: [
      { id: ORDER_ACTION_ACCEPT, text: "Accept" },
      { id: ORDER_ACTION_REJECT, text: "Reject" },
    ],
  });
}

/**
 * Sends a push to a user via OneSignal (external_user_id), falling back to a
 * raw Expo push if OneSignal is unset/fails and the user has an Expo token.
 * Also writes the in-app Firestore-equivalent `notifications` row.
 */
async function dispatchToUser(
  userId: string,
  type: "order" | "system" | "promotion" | "message",
  title: string,
  body: string,
  data: Record<string, any> = {},
  ownerVariant = false
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, body, data },
  });

  const oneSignalSend = ownerVariant ? notifyOwnerNewOrder : notifyUsersByExternalIds;
  const result = await oneSignalSend([userId], title, body, data);

  if (!result || result.ok === false) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.pushToken) {
      await sendExpoPushNotification(user.pushToken, title, body, data);
    }
  }
}

export async function notifyCustomer(
  userId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  return dispatchToUser(userId, "order", title, body, data, false);
}

export async function notifyOwner(
  ownerId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  return dispatchToUser(ownerId, "order", title, body, data, true);
}

export async function notifySystem(userId: string, title: string, body: string): Promise<void> {
  return dispatchToUser(userId, "system", title, body, {}, false);
}
