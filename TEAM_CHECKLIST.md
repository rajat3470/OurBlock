# ✅ Team Onboarding Checklist

Use this checklist to verify your development environment is set up correctly.

---

## 📋 Prerequisites

- [ ] Node.js 18+ installed (`node -v`)
- [ ] Yarn 1.22+ installed (`yarn -v`)
- [ ] Git installed (`git -v`)
- [ ] Code editor (VS Code recommended)
- [ ] iOS Simulator or Android Emulator (for mobile development)

---

## 🚀 Initial Setup

### 1. Clone & Install
- [ ] Clone the repository
- [ ] Run `yarn install` in the root directory
- [ ] Run `cd packages/shared && yarn build && cd ../..`

### 2. Get Firebase Credentials
- [ ] Access to Firebase Console (ask project admin)
- [ ] Firebase project ID: `our-block-app`
- [ ] Firebase web config values copied
- [ ] (Web developers) Service account JSON downloaded

### 3. Environment Configuration

#### Mobile App (`apps/mobile`)
- [ ] Copy `.env.example` to `.env`
- [ ] Update `EXPO_PUBLIC_FIREBASE_API_KEY`
- [ ] Update `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] Update `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] Update `EXPO_PUBLIC_FIREBASE_APP_ID`
- [ ] Verify `EXPO_PUBLIC_API_BASE_URL` points to production

#### Web App (`apps/web`)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Update client Firebase config (same as mobile)
- [ ] Update `FIREBASE_ADMIN_CLIENT_EMAIL`
- [ ] Update `FIREBASE_ADMIN_PRIVATE_KEY`
- [ ] Verify `NEXT_PUBLIC_API_BASE_URL` points to production

---

## 🧪 Verify Setup

### Test API Connection
Run this in your terminal:
```bash
curl https://us-central1-our-block-app.cloudfunctions.net/api/societies
```

**Expected result:** JSON response with `{"success": true, "data": []}`

### Test Mobile App
```bash
cd apps/mobile
yarn start
```

**Expected result:** 
- [ ] Expo dev server starts
- [ ] QR code displayed
- [ ] No environment variable errors

### Test Web App
```bash
cd apps/web
yarn dev
```

**Expected result:**
- [ ] Next.js server starts on port 3000
- [ ] No environment variable errors
- [ ] Can access http://localhost:3000

---

## 📱 Mobile Development Checklist

- [ ] Can run on iOS simulator: `yarn mobile:ios`
- [ ] Can run on Android emulator: `yarn mobile:android`
- [ ] Can toggle between customer and business modes
- [ ] API calls work (check Network tab in dev tools)
- [ ] Firebase Auth initializes without errors

---

## 🌐 Web Development Checklist

- [ ] Next.js development server runs
- [ ] Can import from `@/lib/api`
- [ ] Can import from `@/lib/firebase`
- [ ] API calls return data from production
- [ ] No TypeScript errors

---

## 🔧 Common Issues & Solutions

### Issue: "EXPO_PUBLIC_FIREBASE_API_KEY is not defined"
**Solution:** 
- Make sure `.env` file exists in `apps/mobile/`
- Restart the Expo dev server
- Check that all values are filled in (no `your-xxx-here`)

### Issue: "Network request failed"
**Solution:**
- Check internet connection
- Verify API URL is correct (no trailing slash)
- Test API with curl command above

### Issue: "Firebase: Error (auth/invalid-api-key)"
**Solution:**
- Double-check API key in `.env` matches Firebase Console
- Make sure you copied the entire key
- API key should start with "AIza"

### Issue: Module not found errors
**Solution:**
```bash
# Clean install
yarn clean
yarn install
cd packages/shared && yarn build && cd ../..
```

---

## 📚 Next Steps After Setup

### For Mobile Developers
1. ✅ Read `apps/mobile/API_USAGE_EXAMPLES.ts`
2. ✅ Review existing screens in `apps/mobile/app/`
3. ✅ Check Redux setup in `apps/mobile/src/store/`
4. ✅ Start with authentication screens
5. ✅ Test user registration with production API

### For Web Developers
1. ✅ Review Next.js app structure in `apps/web/src/`
2. ✅ Check API client in `apps/web/src/lib/api.ts`
3. ✅ Start with login page
4. ✅ Build dashboard layout
5. ✅ Test API calls to production

### For Everyone
1. ✅ Join team communication channel
2. ✅ Review [PRODUCTION_API.md](./PRODUCTION_API.md) for API reference
3. ✅ Check [STATUS.md](./STATUS.md) for current progress
4. ✅ Ask questions if stuck!

---

## 🎯 Ready to Code!

If all checkboxes above are checked, you're ready to start developing!

**Quick Links:**
- **Production API:** https://us-central1-our-block-app.cloudfunctions.net/api
- **Firebase Console:** https://console.firebase.google.com/project/our-block-app
- **API Reference:** [PRODUCTION_API.md](./PRODUCTION_API.md)
- **Code Examples:** `apps/mobile/API_USAGE_EXAMPLES.ts`

**Questions?** 
- Check documentation in [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- Ask in team channel
- Review Firebase Console logs

---

**Last Updated:** May 4, 2026  
**Maintainer:** ankushrishi5@gmail.com
