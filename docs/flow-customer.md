# 🛒 Customer (Resident) Flow

> *From zero to doorstep delivery — the complete resident journey.*

---

## 🎯 One-Glance Summary

```
📱 Open App → 🔑 OTP Login → 🏘️ Pick Society → 🏪 Browse Shops → 🛍️ Order → 🚚 Track → ✅ Delivered!
```

---

## 🔐 Getting In

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│    📱  OPEN APP  ─────▶  Enter Phone Number                     │
│                              │                                   │
│                         ┌────▼────┐                              │
│                         │ OTP 📨  │  Static: 987654 (dev)        │
│                         └────┬────┘                              │
│                              │                                   │
│                     ┌────────▼────────┐                          │
│                     │  Phone exists?  │                          │
│                     └───┬─────────┬───┘                          │
│                         │         │                              │
│                    ✅ YES      ❌ NO                              │
│                         │         │                              │
│                    ┌────▼───┐ ┌───▼──────────┐                   │
│                    │ LOGIN  │ │ AUTO-CREATE   │                   │
│                    │ tokens │ │ new account   │                   │
│                    │ issued │ │ + tokens      │                   │
│                    └────┬───┘ └───┬──────────┘                   │
│                         │         │                              │
│                         └────┬────┘                              │
│                              │                                   │
│                         ┌────▼─────────┐                         │
│                         │  🏠 HOME     │                         │
│                         └──────────────┘                         │
│                                                                  │
│  🟢 No registration form needed!                                 │
│  🟢 New phone = new account = instant access                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key point:** Customers are the ONLY role that auto-registers via OTP. No approval, no waiting.

---

## 🏘️ First-Time Setup

```
╔══════════════════════════════════════════════╗
║                                              ║
║   First login?                               ║
║      │                                       ║
║      ├──▶ 📝 Enter Name (first + last)       ║
║      │                                       ║
║      ├──▶ 🏘️  Select Your Society            ║
║      │       │                               ║
║      │       ├── Search by name              ║
║      │       └── Pick from list              ║
║      │                                       ║
║      └──▶ ✅ Done! You're in.                ║
║                                              ║
║   Returning user?                            ║
║      └──▶ 🏠 Straight to Home               ║
║                                              ║
╚══════════════════════════════════════════════╝
```

---

## 🛍️ Shopping Flow

```
 🏠 HOME
  │
  ├──▶ 🏪 Browse Businesses ──▶ Tap a shop
  │         │
  │         ▼
  │    📦 Product Listing
  │         │
  │         ├──▶ ➕ Add to Cart
  │         ├──▶ ➕ Add more items
  │         └──▶ 🛒 View Cart
  │                   │
  │                   ▼
  │           ┌───────────────┐
  │           │   CHECKOUT    │
  │           ├───────────────┤
  │           │ 📍 Address    │
  │           │ 💰 Payment    │──── Cash / UPI / Card
  │           │ 🎫 Coupon?    │
  │           │ 📋 Summary    │
  │           └───────┬───────┘
  │                   │
  │              ┌────▼────┐
  │              │  PAY 💳 │
  │              └────┬────┘
  │                   │
  │         ┌─────────▼──────────┐
  │         │  ✅ Order Placed!  │
  │         └────────────────────┘
  │
  └──▶ 📋 My Orders ──▶ Track any order
```

---

## 📦 Order Lifecycle

```
   ⏳ Pending          Shop owner sees the order
      │
      ▼
   ✅ Confirmed        Owner accepted
      │
      ▼
   👨‍🍳 Preparing        Being prepared
      │
      ▼
   📦 Ready            Packed & waiting for rider
      │
      ▼
   🚚 Out for          Delivery partner picked up
      Delivery
      │
      ▼
   ✅ Delivered!        At your doorstep

   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

   ❌ Cancelled         You cancelled before confirmation
   🚫 Rejected         Shop couldn't fulfill it
```

---

## 💳 Payment Methods

| Method | When You Pay | How |
|:---:|:---:|:---|
| 💵 **Cash** | At delivery | Hand cash to delivery partner |
| 📱 **UPI** | At checkout | Cashfree SDK → UPI app |
| 💳 **Card** | At checkout | Cashfree SDK → card details |

---

## 🔔 What You'll See

| Event | Notification |
|:---|:---|
| Order accepted | "Your order has been confirmed!" |
| Out for delivery | "Your order is on the way!" |
| Delivered | "Order delivered. Enjoy!" |
| Rejected | "Sorry, the shop couldn't fulfill your order." |

---

## 🧭 Screen Map

```
📱 App
 ├── 🏠 Home ──────────── Browse shops, banners, search
 ├── 🛒 Cart ──────────── Review items, checkout
 ├── 📋 Orders ─────────── Active + past orders
 ├── 📦 Order Detail ───── Real-time tracking
 └── 👤 Profile ────────── Name, addresses, society, logout
```

---

<details>
<summary>📡 <b>API Endpoints Used</b></summary>

| Action | Endpoint |
|:---|:---|
| Send OTP | `POST /auth/otp/send` |
| Verify OTP | `POST /auth/user/otp-login` |
| Get businesses | `GET /businesses?societyId=...` |
| Get products | `GET /products?businessId=...` |
| Create order (cash) | `POST /orders` |
| Create order (online) | `POST /payments/create-order` |
| Verify payment | `POST /payments/verify` |
| My orders | `GET /orders/my` |

</details>
