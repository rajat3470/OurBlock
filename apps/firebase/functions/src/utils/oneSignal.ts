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

type OneSignalPayload = {
    app_id?: string;
    include_external_user_ids?: string[];
    headings?: Record<string, string>;
    contents: Record<string, string>;
    data?: Record<string, any>;
    android_channel_id?: string;
    priority?: number;
    ios_sound?: string;
    android_sound?: string;
    content_available?: boolean;
    mutable_content?: boolean;
};

// Node 18+ / Node 20 provides global `fetch` in the runtime used by Functions.
declare const fetch: any;

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
        android_channel_id: 'orders',
    });
}

export default sendOneSignalNotification;
