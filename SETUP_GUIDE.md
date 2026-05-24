# 🔧 Environment Setup Guide

This guide will help you configure your development environment to connect to the production API.

---

## 📱 Mobile App Setup

### 1. Create Environment File

Navigate to the mobile app directory:
```bash
cd apps/mobile
```

Copy the example file:
```bash
cp .env.example .env
```

### 2. Get Firebase Configuration

1. Visit: https://console.firebase.google.com/project/our-block-app/settings/general
2. Scroll to "Your apps" section
3. If no web app exists, click "Add app" → Web
4. Copy the configuration values

### 3. Update .env File

Edit `apps/mobile/.env` with your Firebase values:

```env
# Production API (already configured)
EXPO_PUBLIC_API_BASE_URL=https://us-central1-our-block-app.cloudfunctions.net/api

# Firebase Configuration (update these values)
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=our-block-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=our-block-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. Test the Connection

```bash
# From mobile directory
yarn start
```

The app will now connect to the production API!

---

## 🌐 Web Admin Setup

### 1. Create Environment File

Navigate to the web directory:
```bash
cd apps/web
```

Copy the example file:
```bash
cp .env.example .env.local
```

### 2. Get Firebase Configuration

Same as mobile app (step 2 above).

### 3. Get Firebase Admin SDK Credentials

1. Visit: https://console.firebase.google.com/project/our-block-app/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save the JSON file securely
4. Copy the values from the JSON

### 4. Update .env.local File

Edit `apps/web/.env.local`:

```env
# Production API (already configured)
NEXT_PUBLIC_API_BASE_URL=https://us-central1-our-block-app.cloudfunctions.net/api

# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=our-block-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=our-block-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (from service account JSON)
FIREBASE_ADMIN_PROJECT_ID=our-block-app
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@our-block-app.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### 5. Test the Connection

```bash
# From web directory
yarn dev
```

The admin app will now connect to the production API!

---

## 🧪 Testing the API Connection

### Test with cURL

```bash
# Register a test user
curl -X POST https://us-central1-our-block-app.cloudfunctions.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@mohallamitr.com",
    "password": "Test123!",
    "displayName": "Test User",
    "phoneNumber": "+1234567890",
    "role": "customer"
  }'
```

### Test in Mobile App

Once you start the app, try registering a new user through the UI. The registration should:
1. Create a Firebase Auth user
2. Store user details in Firestore
3. Trigger the welcome notification

---

## 🔄 Switching Between Local and Production

### For Local Development (Emulators)

Edit your `.env` file:

**Mobile:**
```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5001/our-block-app/us-central1/api
EXPO_PUBLIC_USE_EMULATOR=true
```

**Web:**
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001/our-block-app/us-central1/api
NEXT_PUBLIC_USE_EMULATOR=true
```

Don't forget to start the emulators:
```bash
# From root directory
yarn firebase:serve
```

### For Production

Just remove or comment out the emulator lines in your `.env` file.

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Don't share environment files** - Send Firebase config values securely (1Password, LastPass, etc.)
3. **Keep service account keys secure** - Never commit the admin private key
4. **Use different environments** for development and production if needed

---

## ❓ Troubleshooting

### "Network error" or "Connection refused"

**Problem:** Can't connect to API  
**Solution:** 
- Make sure API URL is correct (no trailing slash)
- Check internet connection
- Verify Firebase Functions are deployed: https://console.firebase.google.com/project/our-block-app/functions

### "Firebase: configuration object is invalid"

**Problem:** Firebase config values are missing  
**Solution:**
- Double-check all values in `.env` file
- Make sure no values are `undefined` or `your-xxx-here`
- Restart the development server after changing `.env`

### "401 Unauthorized" errors

**Problem:** Authentication token issues  
**Solution:**
- Make sure you're logged in through Firebase Auth
- Check that the Authorization header is set correctly
- Verify Firebase Auth is enabled in Firebase Console

---

## 📚 Additional Resources

- [PRODUCTION_API.md](./PRODUCTION_API.md) - Complete API endpoint reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Full development guide
- [Firebase Console](https://console.firebase.google.com/project/our-block-app) - Project dashboard

---

## ✅ Next Steps

After setting up your environment:

1. **Mobile Developers:**
   - Build authentication screens
   - Connect to Firebase Auth SDK
   - Test user registration and login
   - Implement business/product screens

2. **Web Developers:**
   - Build login page
   - Create dashboard layout
   - Implement society management
   - Add business approval workflow

3. **All Developers:**
   - Test API endpoints with real data
   - Report any issues
   - Monitor usage in Firebase Console
