# OurBlock

A React Native (Expo) mobile application for society-wise marketplace operations. The repo contains three independent, role-based apps — **SuperAdmin**, **BusinessOwner**, and **User** — sharing a single codebase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (v55) |
| Routing | Expo Router (file-based) |
| Language | TypeScript |
| State | Redux Toolkit |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Auth | Firebase Authentication |
| Push | Firebase Cloud Messaging |
| Real-time | Socket.io |

---

## Running the Apps

Each app is launched independently via its own npm script. No code changes needed between runs.

```bash
npm install
```

### SuperAdmin App
```bash
npm run start:super-admin
npm run start:super-admin:ios
npm run start:super-admin:android
```

### Business Owner App
```bash
npm run start:business-owner
npm run start:business-owner:ios
npm run start:business-owner:android
```

### User App
```bash
npm run start:user
npm run start:user:ios
npm run start:user:android
```

The `EXPO_PUBLIC_APP_TARGET` environment variable (`superAdmin` | `businessOwner` | `user`) controls which app launches. `app/index.tsx` reads this and redirects to the correct login or dashboard.

---

## Project Structure

```
app/
├── index.tsx                  # Root router — redirects by app target + auth state
├── (auth)/
│   ├── _layout.tsx            # Stack layout (no header)
│   ├── role-selection.tsx     # Role picker (generic launch only)
│   ├── super-admin-login.tsx
│   ├── business-owner-login.tsx
│   └── user-login.tsx
├── (super-admin)/
│   ├── _layout.tsx            # Tab layout — RoleGate("superAdmin")
│   ├── dashboard.tsx
│   ├── societies.tsx
│   ├── businesses.tsx
│   ├── users.tsx
│   ├── profile.tsx
│   └── create-society.tsx
├── (business-owner)/
│   ├── _layout.tsx            # Tab layout — RoleGate("businessOwner")
│   ├── dashboard.tsx
│   ├── products.tsx
│   ├── orders.tsx
│   └── profile.tsx
└── (user)/
    ├── _layout.tsx            # Tab layout — RoleGate("user")
    ├── home.tsx
    ├── businesses.tsx
    ├── orders.tsx
    └── profile.tsx

src/
├── components/
│   ├── RoleLoginForm.tsx      # Shared login form (used by all 3 login screens)
│   ├── RoleGate.tsx           # Auth + role guard for tab layouts
│   ├── AppTabIcon.tsx         # Shared tab bar icon
│   └── AppSectionHeader.tsx   # Shared section header
├── constants/
│   └── theme.ts               # Colors, spacing, typography, per-role themes
├── hooks/
│   ├── useAuth.ts
│   ├── useRedux.ts
│   ├── useSociety.ts
│   ├── useSuperAdmin.ts
│   ├── useBusinessOwner.ts
│   └── useUserApp.ts
├── services/
│   ├── apiClient.ts           # Axios instance with JWT interceptors
│   ├── authService.ts
│   ├── societyService.ts
│   ├── businessService.ts
│   ├── productService.ts
│   ├── superAdminService.ts
│   ├── businessOwnerService.ts
│   └── userAppService.ts
├── store/
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       ├── societySlice.ts
│       ├── superAdminSlice.ts
│       ├── businessOwnerSlice.ts
│       └── userAppSlice.ts
├── types/
│   └── index.ts               # All TypeScript interfaces & enums
└── utils/
    ├── helpers.ts
    └── appRouting.ts          # getDefaultRoute(), getHomeRouteByRole()
```

---

## Role Features

### SuperAdmin
- Manage societies (create, edit, delete)
- Verify and manage business owners
- View platform analytics and user management

### Business Owner
- Manage product inventory (add, edit, delete)
- View and manage incoming orders
- Track business performance metrics

### User
- Browse businesses by society and category
- Search products and add to cart
- Place and track orders
- Rate and review businesses

---

## Authentication & Security

- Firebase Auth for identity management
- JWT access tokens (short-lived) + refresh tokens (7 days)
- Automatic token refresh via Axios interceptor
- Route-level guards via `RoleGate` — wrong-role users are redirected instantly
- Login screens have no back button — each app is independent

---

## Other Scripts

```bash
npm run type-check     # TypeScript compiler check
npm run lint           # ESLint
npm run format         # Prettier
npm run test:smoke     # Smoke tests for all 3 app targets
```

---

## Environment Variables

| Variable | Values | Description |
|---|---|---|
| `EXPO_PUBLIC_APP_TARGET` | `superAdmin` \| `businessOwner` \| `user` | Which app to launch |

For API and Firebase config, create a `.env` file:
```env
EXPO_PUBLIC_API_URL=https://api.ourblock.com/v1
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
```

---

## License

Proprietary and confidential.
