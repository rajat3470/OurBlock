import * as functions from 'firebase-functions';
import { notifyUsersByExternalIds } from '../utils/oneSignal';

/**
 * HTTP test endpoint for sending OneSignal notifications to external_user_id(s).
 * Useful for manual verification during staging. Example request:
 * POST /sendTestOneSignal with JSON body { "externalUserIds": ["user123"], "title": "Test", "body": "Hello" }
 * This endpoint should be restricted in production; keep it for staging/dev only.
 */
export const sendTestOneSignal = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Use POST');
            return;
        }

        const { externalUserIds, title, body, data } = req.body || {};
        if (!externalUserIds || !Array.isArray(externalUserIds) || externalUserIds.length === 0) {
            res.status(400).send('externalUserIds required (array)');
            return;
        }

        const resp = await notifyUsersByExternalIds(externalUserIds, title ?? 'Test Notification', body ?? 'Test body', data ?? {});
        res.status(200).json({ ok: true, resp });
    } catch (err) {
        console.error('sendTestOneSignal error', err);
        res.status(500).json({ ok: false, error: String(err) });
    }
});
