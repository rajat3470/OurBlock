# Environment Configuration Templates

## For Mobile App (Expo)

Create `apps/mobile/.env`:

```env
# Production API
EXPO_PUBLIC_API_BASE_URL=https://us-central1-our-block-app.cloudfunctions.net/api

# Firebase Config (get from Firebase Console)
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=our-block-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=our-block-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Use production (not emulators)
EXPO_PUBLIC_USE_EMULATOR=false
```

---

## For Web App (Next.js)

Create `apps/web/.env.local`:

```env
# Production API
NEXT_PUBLIC_API_BASE_URL=https://us-central1-our-block-app.cloudfunctions.net/api

# Firebase Admin (for server-side)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key-from-service-account"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@our-block-app.iam.gserviceaccount.com

# Firebase Client (for client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=our-block-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=our-block-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Use production (not emulators)
NEXT_PUBLIC_USE_EMULATOR=false
```

---

## How to Get Firebase Config Values

### Option 1: Firebase Console Web UI

1. Go to: https://console.firebase.google.com/project/our-block-app/settings/general
2. Scroll to "Your apps" section
3. Click "Add app" or select an existing web app
4. Copy the configuration values

### Option 2: Firebase CLI

```bash
firebase apps:sdkconfig WEB
```

---

## For Local Development (Emulators)

Create `apps/mobile/.env.local`:

```env
# Local API (emulators)
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5001/our-block-app/us-central1/api

# Firebase Config (same as production)
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=our-block-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=our-block-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Use emulators
EXPO_PUBLIC_USE_EMULATOR=true
EXPO_PUBLIC_EMULATOR_AUTH_URL=http://127.0.0.1:9099
EXPO_PUBLIC_EMULATOR_FIRESTORE_HOST=127.0.0.1
EXPO_PUBLIC_EMULATOR_FIRESTORE_PORT=8080
```

---

## Usage in Code

### React Native (Expo)

```javascript
// src/config/api.ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase with emulator support
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, process.env.EXPO_PUBLIC_EMULATOR_AUTH_URL);
  connectFirestoreEmulator(
    db, 
    process.env.EXPO_PUBLIC_EMULATOR_FIRESTORE_HOST,
    parseInt(process.env.EXPO_PUBLIC_EMULATOR_FIRESTORE_PORT)
  );
}
```

### Next.js

```javascript
// lib/firebase.ts
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// lib/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
```

---

## Security Notes

⚠️ **Important:**
- **Never commit `.env` files to Git**
- Add `.env*` to `.gitignore` (except `.env.example`)
- Share environment variables securely with your team (e.g., 1Password, LastPass)
- For production builds, use environment variable management in your CI/CD

---

## Team Distribution

Share these files with your team:
1. ✅ [PRODUCTION_API.md](./PRODUCTION_API.md) - API endpoints reference
2. ✅ This file - Environment variable templates
3. Firebase config values (securely)

Each team member should:
1. Copy appropriate `.env.example` to `.env`
2. Fill in Firebase config values
3. Choose production or local API URL
4. Never commit their `.env` file
