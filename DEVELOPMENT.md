# Development Guide

## Quick Start

### 1. Install Dependencies
```bash
cd OurBlock
yarn install
```

### 2. Build Shared Package
```bash
cd packages/shared
yarn build
```

### 3. Start Firebase Emulators
```bash
# From root directory
yarn firebase:serve
```

This will start:
- **Emulator UI:** http://127.0.0.1:4000/
- **Functions API:** http://127.0.0.1:5001/our-block-app/us-central1/api
- **Authentication:** 127.0.0.1:9099
- **Firestore:** 127.0.0.1:8080
- **Storage:** 127.0.0.1:9199

### 4. Start Mobile App
```bash
# In a new terminal
yarn mobile:customer    # For customer app
# OR
yarn mobile:business    # For business owner app
```

### 5. Start Web Admin (Optional)
```bash
# In a new terminal
yarn web
```

---

## API Endpoints

**Production URL:** `https://us-central1-our-block-app.cloudfunctions.net/api`  
**Local URL:** `http://127.0.0.1:5001/our-block-app/us-central1/api`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (set custom claims)
- `GET /auth/me` - Get current user

### Societies
- `GET /societies` - List all societies
- `GET /societies/:id` - Get society by ID
- `POST /societies` - Create society (Super Admin only)

### Businesses
- `GET /businesses` - List all businesses
- `GET /businesses/:id` - Get business by ID
- `POST /businesses` - Create business
- `PUT /businesses/:id` - Update business
- `DELETE /businesses/:id` - Delete business

### Products
- `GET /products` - List all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Orders
- `GET /orders` - List all orders
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create order
- `PUT /orders/:id` - Update order

### Users
- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user

---

## Testing API with cURL

### Register a User
```bash
curl -X POST http://127.0.0.1:5001/our-block-app/us-central1/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User",
    "phoneNumber": "+1234567890",
    "role": "customer"
  }'
```

### Create a Society (Super Admin)
```bash
curl -X POST http://127.0.0.1:5001/our-block-app/us-central1/api/societies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Green Valley Society",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "contactPerson": {
      "name": "John Doe",
      "phone": "+91-9876543210",
      "email": "admin@greenvalley.com"
    }
  }'
```

---

## Firebase Emulator UI

Access the Firebase Emulator UI at http://127.0.0.1:4000/

Features:
- **Authentication:** View and manage test users
- **Firestore:** Browse and edit database documents
- **Storage:** Upload and manage test files
- **Functions:** View function logs and test endpoints

---

## Project Structure

```
mohallaMitr/
├── apps/
│   ├── mobile/           # React Native app (Expo)
│   ├── web/              # Next.js admin dashboard
│   └── firebase/         # Cloud Functions backend
│       └── functions/    # Actual functions code
│           ├── src/
│           │   ├── api/        # REST API routes
│           │   ├── triggers/   # Database triggers
│           │   ├── shared/     # Copied from packages/shared
│           │   └── index.ts    # Main entry point
│           └── lib/            # Compiled JavaScript (build output)
└── packages/
    └── shared/           # Shared types, utils, validation
        ├── src/          # TypeScript source
        └── dist/         # Compiled output
```

---

## Common Issues

### Firebase Functions Not Loading
**Problem:** Functions fail to load with "command not found" error  
**Solution:** Run `cd apps/firebase/functions && npm install` to install dependencies

### TypeScript Compilation Errors
**Problem:** Build fails with type errors  
**Solution:** 
1. Rebuild shared package: `cd packages/shared && yarn build`
2. Check TypeScript version: `yarn --version`
3. Clear build cache: `yarn clean`

### Emulator Port Conflicts
**Problem:** "Port already in use" error  
**Solution:** 
1. Kill existing processes: `lsof -ti:5001 | xargs kill -9`
2. Or change ports in `apps/firebase/firebase.json`

### Node Version Mismatch
**Problem:** Warning about Node version  
**Solution:** The warning is safe to ignore - emulators will use your global Node version (20+)

---

## Next Steps

### For Backend Development
1. ✅ Firebase emulators running
2. Test API endpoints with Postman/cURL
3. Add authentication middleware
4. Implement business logic
5. Add data validation

### For Mobile Development
1. Configure Firebase SDK in mobile app
2. Set up environment variables (`.env`)
3. Connect to Firebase emulators
4. Build authentication flow
5. Implement UI screens

### For Web Development
1. Configure Next.js Firebase Admin SDK
2. Build login page
3. Create dashboard layouts
4. Implement CRUD operations
5. Add role-based access control

---

## Environment Setup

### Mobile App (.env)
Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:abc123

# For local development
EXPO_PUBLIC_USE_EMULATOR=true
```

### Web App (.env.local)
Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=our-block-app
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@our-block-app.iam.gserviceaccount.com

# For local development
NEXT_PUBLIC_USE_EMULATOR=true
```

---

## Deployment

### Deploy Functions
```bash
# Login to Firebase
firebase login

# Deploy functions only
yarn firebase:deploy
```

### Build Mobile App
```bash
# iOS
cd apps/mobile
eas build --platform ios

# Android
eas build --platform android
```

### Deploy Web App
```bash
cd apps/web
yarn build
# Deploy to Vercel, Netlify, or Firebase Hosting
```

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
