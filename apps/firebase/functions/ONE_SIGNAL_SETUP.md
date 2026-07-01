OneSignal setup for Firebase Functions

This project supports sending OneSignal push notifications from Firebase Functions.

1) Set OneSignal credentials in Functions config (recommended)

Run from your project root or inside `apps/firebase`:

```bash
firebase functions:config:set onesignal.app_id="YOUR_ONESIGNAL_APP_ID" onesignal.api_key="YOUR_ONESIGNAL_API_KEY"
```

Then deploy functions:

```bash
cd apps/firebase
npm run build
firebase deploy --only functions
```

2) Alternative: set environment variables

If you prefer, you can set `ONESIGNAL_APP_ID` and `ONESIGNAL_API_KEY` in your deployment environment. The functions helper will prefer `functions.config().onesignal` when available, falling back to these env vars.

3) Test endpoint (staging/dev)

A simple HTTP endpoint `sendTestOneSignal` is provided to manually trigger notifications for testing. Example:

```bash
# send a test notification to external user id 'user123'
curl -X POST https://<REGION>-<PROJECT>.cloudfunctions.net/sendTestOneSignal \
  -H "Content-Type: application/json" \
  -d '{"externalUserIds":["user123"],"title":"Hello","body":"Test message"}'
```

Note: For production, ensure this endpoint is secured or removed.
