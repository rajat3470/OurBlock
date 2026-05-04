# OurBlock - Local Society Marketplace Platform

A hyperlocal marketplace platform connecting residents within residential societies with local businesses and service providers.

![Phase 1 - MVP](https://img.shields.io/badge/Phase-1%20MVP-blue)
![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![API Status](https://img.shields.io/badge/API-Deployed%20🚀-success)

---

## 🚀 Production API - LIVE!

**Your team can now use the deployed API:**
```
https://us-central1-our-block-app.cloudfunctions.net/api
```

📖 **Complete API Reference:** [PRODUCTION_API.md](./PRODUCTION_API.md)  
🔧 **Environment Setup:** [ENV_TEMPLATES.md](./ENV_TEMPLATES.md)

---

## 🚀 Quick Start

**For New Team Members:**
1. ✅ Complete [TEAM_CHECKLIST.md](./TEAM_CHECKLIST.md) to verify your setup
2. 📖 Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed environment setup
3. 🔥 API is already deployed - see [PRODUCTION_API.md](./PRODUCTION_API.md)
4. 📝 Check API usage examples in `apps/mobile/API_USAGE_EXAMPLES.ts`

**For Development:**
```bash
# Install dependencies
yarn install

# Build shared package
cd packages/shared && yarn build && cd ../..

# Start Firebase emulators (optional - for backend development)
yarn firebase:serve

# In a new terminal: Start mobile app
yarn mobile:customer
```

**Production API is live and ready to use:**
```
https://us-central1-our-block-app.cloudfunctions.net/api
```

---

## 🏗️ Architecture

OurBlock is built as a **monorepo** with three main applications and shared packages:

```
OurBlock/
├── apps/
│   ├── mobile/          # React Native (Expo) - Customer & Business Owner
│   ├── web/             # Next.js - Super Admin Dashboard
│   └── firebase/        # Firebase Cloud Functions - Backend API
├── packages/
│   ├── shared/          # Shared types, utilities, and validation schemas
│   └── ui/              # Shared UI components (future)
└── docs/                # Documentation
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native (Expo v55), TypeScript, Redux Toolkit, Expo Router |
| **Web** | Next.js 14, TypeScript, React, Tailwind CSS |
| **Backend** | Firebase (Firestore, Auth, Storage, Cloud Functions) |
| **Shared** | TypeScript, Zod (validation) |
| **Monorepo** | Yarn Workspaces |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js:** v18 or higher
- **Yarn:** v1.22 or higher
- **Firebase CLI:** `npm install -g firebase-tools`
- **Expo CLI:** Included in project dependencies
- **iOS/Android:** iOS Simulator or Android Emulator

### Installation

```bash
cd OurBlock
yarn install
```

### Running the Apps

#### Mobile App (Customer & Business Owner)
```bash
# Start for Customer
yarn mobile:customer

# Start for Business Owner
yarn mobile:business

# Or run on specific platform
yarn mobile:ios
yarn mobile:android
```

#### Web Admin (Super Admin)
```bash
yarn web          # Development server at http://localhost:3000
```

#### Firebase Backend
```bash
# Local emulators
yarn firebase:serve

# Deploy to production
yarn firebase:deploy
```

---

## 📱 Applications Overview

### 1. Mobile App (`apps/mobile`)
**Platforms:** iOS, Android  
**Users:** Customers & Business Owners

**Customer Features:**
- Society selection (GPS or manual)
- Browse products by category
- Place and track orders
- Rate and review businesses

**Business Owner Features:**
- Product catalog management
- Order management (accept/reject/update status)
- Inventory management
- Analytics dashboard

### 2. Web Admin (`apps/web`)
**Platform:** Web  
**Users:** Super Admin

- Society management (CRUD)
- Business owner account creation
- User management  
- Platform analytics

### 3. Firebase Backend (`apps/firebase`)
**Platform:** Cloud Functions  
**Purpose:** API & Background Jobs

- RESTful API endpoints
- Authentication & authorization
- Database triggers (notifications)
- Scheduled tasks

---

## 📁 Project Structure

### Mobile App (`apps/mobile/`)
```
app/                          # Expo Router pages
  ├── _layout.tsx
  ├── index.tsx
  ├── (auth)/                 # Auth screens
  │   ├── business-owner-login.tsx
  │   ├── role-selection.tsx
  │   └── user-login.tsx
  ├── (business-owner)/       # Business owner screens
  │   ├── dashboard.tsx
  │   ├── orders.tsx
  │   ├── products.tsx
  │   └── profile.tsx
  └── (user)/                 # Customer screens
      ├── home.tsx
      ├── businesses.tsx
      ├── orders.tsx
      └── profile.tsx
src/
  ├── components/             # Reusable components
  ├── hooks/                  # Custom hooks
  ├── services/               # API clients
  ├── store/slices/           # Redux store
  └── utils/                  # Helper functions
```

### Web Admin (`apps/web/`)
```
src/
  ├── app/                    # Next.js App Router
  │   ├── login/
  │   └── dashboard/
  │       ├── societies/
  │       ├── businesses/
  │       ├── users/
  │       └── settings/
  ├── components/
  ├── lib/
  └── services/
```

### Firebase Backend (`apps/firebase/`)
```
functions/src/
  ├── index.ts                # Entry point
  ├── api/                    # API routes
  │   ├── auth.ts
  │   ├── societies.ts
  │   ├── businesses.ts
  │   ├── products.ts
  │   ├── orders.ts
  │   └── users.ts
  └── triggers/               # Firestore triggers
      ├── onUserCreate.ts
      ├── onOrderCreate.ts
      └── onOrderUpdate.ts
```

### Shared Package (`packages/shared/`)
```
src/
  ├── types.ts                # TypeScript interfaces
  ├── constants.ts            # App constants
  ├── utils.ts                # Utility functions
  └── validation.ts           # Zod schemas
```

---

## 🔥 Firebase Collections

| Collection | Description |
|-----------|-------------|
| `users` | User accounts (all roles) |
| `societies` | Residential societies |
| `businesses` | Business profiles |
| `products` | Product catalog |
| `orders` | Customer orders |
| `reviews` | Product/business reviews |
| `addresses` | User delivery addresses |
| `notifications` | Push notifications |

---

## 🔐 Security

- **Firestore Rules:** Role-based access control (RBAC)
- **Storage Rules:** Secure file uploads with size/type validation
- **Authentication:** Firebase Auth with custom claims
- **API:** JWT token validation on all endpoints

---

## 🎯 Phase 1 Status

✅ **Completed:**
- ✅ Monorepo structure with Yarn Workspaces
- ✅ Shared package with types, utilities, validation schemas
- ✅ Firebase backend with Cloud Functions
- ✅ API routes (Auth, Societies, Businesses, Products, Orders, Users)
- ✅ Firestore security rules with RBAC
- ✅ Database triggers (notifications)
- ✅ Firebase emulators running locally
- ✅ TypeScript compilation working across all packages

🚧 **In Progress:**
- Mobile app UI screens
- Web admin UI pages
- Authentication flow integration
- Product catalog implementation
- Order management workflow

❌ **Excluded from Phase 1:**
- Chat/messaging system
- Digital wallet
- Subscription orders

---

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - ⚡ **START HERE** - Quick environment setup for new developers
- **[PRODUCTION_API.md](./PRODUCTION_API.md)** - 🔥 Production API reference for your team
- **[ENV_TEMPLATES.md](./ENV_TEMPLATES.md)** - Environment variable templates and usage
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development setup guide
- **[STATUS.md](./STATUS.md)** - Current implementation status & next steps
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration guide
- **[PROJECT_DETAILS.md](./PROJECT_DETAILS.md)** - Technical specifications
- **[BUSINESS_DOCUMENTATION.md](./BUSINESS_DOCUMENTATION.md)** - Business model

---

## 🛠️ All Commands

```bash
# Mobile
yarn mobile                 # Start Expo dev server
yarn mobile:customer        # Customer app mode
yarn mobile:business        # Business owner app mode  
yarn mobile:ios             # iOS simulator
yarn mobile:android         # Android emulator

# Web
yarn web                    # Next.js dev server

# Firebase
yarn firebase:serve         # Start local emulators
yarn firebase:deploy        # Deploy functions

# Development
yarn lint                   # Lint all workspaces
yarn type-check             # TypeScript check all workspaces
yarn clean                  # Clean all node_modules
```

---

## 🐛 Troubleshooting

### Firebase emulator not starting:
```bash
lsof -ti:5001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
cd apps/firebase && firebase emulators:start
```

### Expo build errors:
```bash
cd apps/mobile
rm -rf .expo node_modules
yarn install
yarn start --clear
```

### Type errors in shared package:
```bash
cd packages/shared && yarn build
```

---

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for building stronger local communities**
