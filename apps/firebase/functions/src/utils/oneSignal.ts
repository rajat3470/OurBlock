import * as https from 'https';

/**
 * Lightweight OneSignal server helper for Firebase Functions.
 * Uses the OneSignal REST API to send notifications targeted by external_user_id.
 */
const ONE_SIGNAL_API = 'https://onesignal.com/api/v1/notifications';

// Prefer Firebase functions config (set via `firebase functions:config:set onesignal.app_id=... onesignal.api_key=...`)
// Fallback to environment variables for other deploy environments.
let APP_ID = process.env.ONESIGNAL_APP_ID ?? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
let API_KEY = process.env.ONESIGNAL_API_KEY ?? process.env.NEXT_PUBLIC_ONESIGNAL_API_KEY;

// Attempt to read `functions.config().onesignal` when available (Firebase runtime).
try {
    // Import lazily so this module can be used in non-functions contexts without error.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const functions = require('firebase-functions');
    const cfg = functions.config && (functions.config().onesignal ?? functions.config().onesignal);
    if (cfg) {
        APP_ID = APP_ID ?? cfg.app_id ?? cfg.appId ?? cfg.app;
        API_KEY = API_KEY ?? cfg.api_key ?? cfg.apikey ?? cfg.key;
    }
} catch (err) {
    // Not running inside firebase-functions or require failed; that's fine.
}

type OneSignalButton = {
    id: string;
    text: string;
    icon?: string;
};

type OneSignalPayload = {
    app_id?: string;
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
};

export const NEW_ORDER_SOUND_IOS = 'new_order_alert.wav';
export const NEW_ORDER_SOUND_ANDROID = 'new_order_alert';
export const ANDROID_ORDERS_CHANNEL_ID = 'orders';
export const ORDER_ACTION_ACCEPT = 'accept_order';
export const ORDER_ACTION_REJECT = 'reject_order';

// Node 18+ / Node 20 provides global `fetch` in the runtime used by Functions.
declare const fetch: any;

export async function sendExpoPushNotification(pushToken: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken[')) return;

    const payload = JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data ?? {},
    });

    await new Promise<void>((resolve) => {
        const options = {
            hostname: 'exp.host',
            path: '/--/api/v2/push/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };
        const req = https.request(options, () => resolve());
        req.on('error', () => resolve());
        req.write(payload);
        req.end();
    });
}

export async function sendOneSignalNotification(payload: OneSignalPayload): Promise<any> {
    if (!APP_ID || !API_KEY) {
        console.warn('[OneSignal] APP_ID or API_KEY not set; skipping OneSignal send');
        return null;
    }

    const body: OneSignalPayload = { ...payload, app_id: APP_ID };

    try {
        const res = await fetch(ONE_SIGNAL_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                Authorization: `Basic ${API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            console.warn('[OneSignal] send failed', res.status, text);
            return { ok: false, status: res.status, text };
        }

        const json = await res.json();
        return json;
    } catch (err) {
        console.error('[OneSignal] send error', err);
        return { ok: false, error: err };
    }
}

export async function notifyUsersByExternalIds(
    externalUserIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>
) {
    if (!externalUserIds || externalUserIds.length === 0) return null;

    return sendOneSignalNotification({
        include_external_user_ids: externalUserIds,
        headings: { en: title },
        contents: { en: body },
        data: data ?? {},
        priority: 10,
        ios_sound: 'default',
        android_sound: 'default',
        content_available: true,
        mutable_content: true,
        channel_for_external_user_ids: 'push',
    });
}

/** Owner-only new order push with custom sound and accept/reject action buttons. */
export async function notifyOwnerNewOrder(
    externalUserIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>
) {
    if (!externalUserIds || externalUserIds.length === 0) return null;

    const payloadData: Record<string, string> = {};
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            payloadData[key] = value == null ? '' : String(value);
        }
    }

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
        channel_for_external_user_ids: 'push',
        url: 'mohallamitr://orders',
        buttons: [
            { id: ORDER_ACTION_ACCEPT, text: 'Accept' },
            { id: ORDER_ACTION_REJECT, text: 'Reject' },
        ],
    });
}

export default sendOneSignalNotification;
