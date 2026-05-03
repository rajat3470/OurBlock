# OurBlock — Project Details

## Architecture Overview

OurBlock is structured as a **monorepo with three independent apps** sharing a single React Native / Expo codebase. At runtime, the `EXPO_PUBLIC_APP_TARGET` environment variable determines which app boots. Each app has its own route group, tab layout, Redux slice, service layer, and custom hook.

```
┌─────────────────────────────────────────────────────┐
│                    OurBlock Monorepo                │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ SuperAdmin  │  │BusinessOwner │  │   User    │  │
│  │    App      │  │    App       │  │   App     │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼──────┐  │
│  │          Shared Infrastructure               │  │
│  │  Components · Redux · Services · Theme       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Data Models

### Society
```typescript
{
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  totalBusinesses: number
  totalUsers: number
  isActive: boolean
  createdBy: string   // SuperAdmin ID
}
```

### Business
```typescript
{
  id: string
  ownerId: string
  name: string
  category: BusinessCategory
  societyId: string
  isVerified: boolean
  operatingHours: { open: string; close: string }
  rating: number
  totalReviews: number
}
```

### Product
```typescript
{
  id: string
  businessId: string
  name: string
  price: number
  discountedPrice?: number
  stock: number
  images: string[]
  attributes: { name: string; value: string }[]
}
```

### Order
```typescript
{
  id: string
  userId: string
  businessId: string
  items: OrderItem[]
  status: OrderStatus
  deliveryAddress: Address
  paymentMethod: string
  paymentStatus: string
  totalAmount: number
  trackingUpdates: TrackingUpdate[]
}
```

---

## Redux Store Structure

```
store/
├── auth
│   ├── user            (User | null)
│   ├── isAuthenticated (boolean)
│   ├── isLoading       (boolean)
│   └── error           (string | null)
├── society
│   ├── selectedSociety (Society | null)
│   ├── societies       (Society[])
│   └── isLoading
├── superAdmin
│   ├── stats           (platform analytics)
│   ├── societies       (managed list)
│   ├── businesses      (pending/verified)
│   └── users           (all users)
├── businessOwner
│   ├── business        (owner's business)
│   ├── products        (product list)
│   ├── orders          (incoming orders)
│   └── stats           (revenue/analytics)
└── userApp
    ├── businesses      (nearby businesses)
    ├── orders          (user's orders)
    ├── featuredProducts
    └── favorites
```

---

## API Service Layer

All services use `apiClient.ts` — an Axios instance with:
- Automatic JWT `Authorization` header injection
- Transparent access-token refresh on 401 responses
- Secure token storage via `AsyncStorage`

| Service | Responsibilities |
|---|---|
| `authService` | Login, register, logout, password reset (all 3 roles) |
| `societyService` | CRUD for societies |
| `businessService` | Business CRUD, verification |
| `productService` | Product catalog, search |
| `superAdminService` | Platform stats, society & user management |
| `businessOwnerService` | Business profile, products, orders |
| `userAppService` | Browse businesses, place orders, favorites |

---

## Routing Logic

`app/index.tsx` calls `getDefaultRoute(isAuthenticated, userRole, appTarget)`:

| App Target | Not Authenticated | Authenticated |
|---|---|---|
| `superAdmin` | `/(auth)/super-admin-login` | `/(super-admin)/dashboard` |
| `businessOwner` | `/(auth)/business-owner-login` | `/(business-owner)/dashboard` |
| `user` | `/(auth)/user-login` | `/(user)/home` |
| *(none)* | `/(auth)/role-selection` | Role-based home |

`router.replace` is always used (never `push`), so there is no back-navigation history from the login screen.

---

## Role Gate

`src/components/RoleGate.tsx` wraps each tab layout. On every render it checks:
1. Is the user authenticated?
2. Does `user.role` match the required role?

If either check fails it immediately calls `router.replace(getHomeRouteByRole(user?.role))`.

---

## Theme System

`src/constants/theme.ts` exports:

```typescript
colors        // Palette: blue, green, orange, red, gray, …
roleTheme     // Per-role primary/secondary/accent colors
spacing       // xs → xxxl
radius        // sm → full
typography    // fontSize, fontWeight presets
```

Every screen and component imports from this file — no hard-coded color or spacing values.

---

## Key Conventions

- **No `@constants/*` path alias** — use relative imports for `theme.ts`
- **Typed Redux hooks** — `useAppDispatch` / `useAppSelector` from `src/hooks/useRedux.ts`
- **`UserRole` type** — `"superAdmin" | "businessOwner" | "user"` (from `src/types/index.ts`)
- **Login screens** — no back button; each app is fully independent

---

## Roadmap

### Phase 2 — Commerce
- Shopping cart with quantity management
- Checkout with multiple delivery addresses
- Payment integration (Razorpay / Stripe)
- Real-time order status via WebSocket

### Phase 3 — Engagement
- In-app chat between users and businesses
- Push notifications for order updates
- Reviews and ratings
- Wishlist / favorites

### Phase 4 — Scale
- SuperAdmin analytics dashboard (charts)
- Business performance reports
- Subscription tiers for business owners
- Referral and loyalty programs
