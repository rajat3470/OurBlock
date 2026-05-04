# Firebase Initialization Guide

When you run `firebase init`, select ONLY these features:

## SELECT THESE (use Space to select, Enter to confirm):
- [x] Firestore (Configure security rules and indexes)
- [x] Functions (Configure Cloud Functions directory)  
- [x] Storage (Configure security rules)
- [x] Emulators (Set up local emulators)

## DO NOT SELECT:
- [ ] Data Connect
- [ ] Genkit
- [ ] App Hosting
- [ ] Hosting
- [ ] Remote Config
- [ ] Extensions
- [ ] Realtime Database
- [ ] Authentication (use Firebase Auth SDK in apps)
- [ ] AI Logic

## Step-by-Step Answers:

1. **Which Firebase features?** 
   - Select: Firestore, Functions, Storage, Emulators

2. **Use an existing project or create new?**
   - Select: Use an existing project
   - Choose: our-block-app

3. **Firestore Rules:**
   - File exists, overwrite? **No** (keep existing)

4. **Firestore Indexes:**
   - File exists, overwrite? **No** (keep existing)

5. **Functions Setup:**
   - Detected existing codebase, what to do? **Overwrite**
   - Language? **TypeScript**
   - Use ESLint? **Yes**
   - Install dependencies? **Yes**

6. **Storage Rules:**
   - File exists, overwrite? **No** (keep existing)

7. **Emulators Setup:**
   - Which emulators? Select:
     - [x] Authentication
     - [x] Functions
     - [x] Firestore
     - [x] Storage
   - Ports: Accept defaults (Auth: 9099, Functions: 5001, Firestore: 8080, Storage: 9199)
   - Enable Emulator UI? **Yes**
   - Download emulators now? **Yes**

## After Initialization:

Your files are already set up correctly. Firebase init will configure:
- firebase.json (emulator settings)
- .firebaserc (project alias)
- functions/ will be reconfigured but your src/ code is safe

The custom code in `functions/src/` is already written and won't be lost!
