# 🚚 Delivery Partner Flow

> *From onboarding to delivering orders — the complete rider journey.*

---

## 🎯 One-Glance Summary

```
🏪 Business Owner creates you → 📱 OTP Login → 🛒 See assigned orders → 🚚 Deliver → 💵 Collect → ✅ Done!
```

---

## ⚡ The Key Difference

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🟢 Customer        → Self-register via OTP                ║
║   🟡 Business Owner  → Self-register via OTP                ║
║   🔴 Delivery Partner → CANNOT self-register                 ║
║                                                              ║
║   ┌──────────────────────────────────────────────────┐       ║
║   │  Only a Business Owner can create your account.  │       ║
║   │  They enter YOUR phone number in their app.      │       ║
║   │  Then YOU login with OTP on that phone.           │       ║
║   └──────────────────────────────────────────────────┘       ║
║                                                              ║
║   ❌ Unregistered phone → "Contact your business owner"      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 👷 How You Get Created

```
  🏪 BUSINESS OWNER'S APP
  ────────────────────────

  Profile → 🛵 Delivery Partners → ➕ Add Partner
      │
      ▼
  ┌────────────────────────────────┐
  │  📝 Create Delivery Partner    │
  │                                │
  │  👤 First Name: ___________    │
  │  👤 Last Name:  ___________    │
  │  📱 Phone:      ___________    │
  │  📧 Email:      ___________ (optional)
  │  🔑 Password:   ___________    │
  │                                │
  │        [ Create Partner ]      │
  └──────────────┬─────────────────┘
                 │
                 ▼
  ┌────────────────────────────────┐
  │  ✅ Partner Account Created    │
  │                                │
  │  Auto-linked to:               │
  │  • 🏪 This business            │
  │  • 🏘️  This society             │
  │  • 👤 This owner               │
  │                                │
  │  Partner can now login          │
  │  with their phone + OTP        │
  └────────────────────────────────┘
```

---

## 🔐 Login Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   📱 Open App (Delivery Partner target)                          │
│      │                                                           │
│      ▼                                                           │
│   Enter Phone Number                                             │
│      │                                                           │
│      ├───── 📨 OTP Sent (987654 in dev)                          │
│      │                                                           │
│      ▼                                                           │
│   Enter OTP Code                                                 │
│      │                                                           │
│      ├─── ✅ Phone registered ──▶ 🏠 Dashboard                   │
│      │                                                           │
│      └─── ❌ Not registered                                      │
│              │                                                   │
│              ▼                                                   │
│      ┌──────────────────────────────────────┐                    │
│      │  🔴 Account not found                │                    │
│      │                                      │                    │
│      │  No account found with this phone    │                    │
│      │  number. Please contact your         │                    │
│      │  business owner to register.         │                    │
│      └──────────────────────────────────────┘                    │
│                                                                  │
│   ⚠️  This is an inline error banner, not a toast!               │
│   It stays visible until you change the number.                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛒 Delivery Lifecycle

```
  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │  📋 ORDER ASSIGNED TO YOU                       │
  │     │                                           │
  │     │  Business owner picks you as rider        │
  │     │  when order is "Ready"                    │
  │     │                                           │
  │     ▼                                           │
  │  ┌─────────────────────────────────┐            │
  │  │ 🔔 Push Notification            │            │
  │  │ "New delivery assigned!"        │            │
  │  └──────────────┬──────────────────┘            │
  │                 │                               │
  │                 ▼                               │
  │  ┌─────────────────────────────────┐            │
  │  │ 📦 PICK UP                      │            │
  │  │                                 │            │
  │  │ Go to shop                      │            │
  │  │ Collect the order               │            │
  │  │ Tap "Picked Up"                 │            │
  │  └──────────────┬──────────────────┘            │
  │                 │                               │
  │                 ▼                               │
  │  ┌─────────────────────────────────┐            │
  │  │ 🚚 OUT FOR DELIVERY             │            │
  │  │                                 │            │
  │  │ Navigate to customer address    │            │
  │  │ Customer can track in real-time │            │
  │  └──────────────┬──────────────────┘            │
  │                 │                               │
  │                 ▼                               │
  │  ┌─────────────────────────────────┐            │
  │  │ 📸 DELIVER & CONFIRM            │            │
  │  │                                 │            │
  │  │ Hand over the order             │            │
  │  │ Take proof photo (optional)     │            │
  │  │ Tap "Delivered"                 │            │
  │  └──────────────┬──────────────────┘            │
  │                 │                               │
  │       ┌─────────┼──────────┐                    │
  │       │                    │                    │
  │  💳 Prepaid               💵 Cash on Delivery   │
  │       │                    │                    │
  │  Already paid         ┌────▼─────────┐          │
  │  → Done!              │ 💵 COLLECT   │          │
  │                       │    PAYMENT   │          │
  │                       │              │          │
  │                       │ Amount: ₹XXX │          │
  │                       │ Method: Cash │          │
  │                       │              │          │
  │                       │ [ Confirm ]  │          │
  │                       └──────────────┘          │
  │                                                 │
  │  ────────────────────────────────────────       │
  │                                                 │
  │  ✅ ORDER COMPLETE                              │
  │     Earnings updated                            │
  │     Ready for next delivery!                    │
  │                                                 │
  └─────────────────────────────────────────────────┘
```

---

## 💵 Payment Collection

| Order Payment | What You Do |
|:---:|:---|
| 💳 **Prepaid** (UPI/Card) | Just deliver — money already collected |
| 💵 **Cash on Delivery** | Collect cash → tap "Payment Collected" → hand cash to shop owner |

```
  💵 COD Collection Flow:
  
  Deliver order ──▶ Collect ₹ from customer ──▶ Mark collected in app ──▶ Hand cash to shop
```

---

## 🧭 Screen Map

```
📱 Delivery Partner App
 │
 ├── 🏠 Dashboard ──────── Active deliveries, earnings summary
 │      │
 │      ├── 📦 Delivery #1 ─── Tap to see details
 │      │    ├── 🏪 Shop address
 │      │    ├── 📍 Customer address
 │      │    ├── 📋 Items list
 │      │    ├── 💰 Amount + payment method
 │      │    └── ▶️  Action buttons (picked up / delivered / collect)
 │      │
 │      └── 📦 Delivery #2 ...
 │
 └── 👤 Profile ────────── Your info, linked shop, logout
```

---

## 🔗 Your Link to the Business

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  You are always linked to ONE business:          │
│                                                  │
│  👤 You ──────────┐                              │
│                   ▼                              │
│  ┌────────────────────────┐                      │
│  │ 🏪 ABC Grocery         │  Your shop           │
│  │ 👤 Owner: Rajat         │  Who created you     │
│  │ 🏘️  Green Valley Society │  Your society        │
│  │ 📱 9876543210           │  Shop phone          │
│  └────────────────────────┘                      │
│                                                  │
│  You can ONLY deliver orders for THIS business.  │
│  To deliver for another shop, that shop owner    │
│  must create a new account for you.              │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## ⚠️ Edge Cases

| Scenario | What Happens |
|:---|:---|
| Phone not registered | Error: "Contact your business owner to register" |
| Try to register yourself | Not possible — no self-registration |
| Shop gets suspended | You can still login but won't get new deliveries |
| Owner deletes you | You can't login anymore |
| Multiple shops | Each shop creates a separate account (different phone or same phone different owner) |

---

<details>
<summary>📡 <b>API Endpoints Used</b></summary>

| Action | Endpoint |
|:---|:---|
| Send OTP | `POST /auth/otp/send` |
| Verify OTP | `POST /auth/deliverypartner/otp-login` |
| Get assigned deliveries | `GET /delivery/my-orders` |
| Mark picked up | `PUT /delivery/:orderId/picked-up` |
| Mark delivered | `PUT /delivery/:orderId/delivered` |
| Collect payment | `PUT /delivery/:orderId/collect-payment` |

</details>
