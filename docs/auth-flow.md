# Authentication Flows

## Quick Reference

| | Resident | Business Owner | Delivery Partner |
|---|:---:|:---:|:---:|
| **OTP Login** | Auto-register | Pre-registered only | Pre-registered only |
| **OTP Registration** | Auto (on login) | Self (OTP + shop details) | Not available |
| **Email/Password** | Yes | Yes | Yes |
| **Who creates account?** | Self (OTP) | Self (OTP registration) | Business Owner |
| **Static OTP (dev)** | `987654` | `987654` | `987654` |

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTER PHONE NUMBER                       │
│                    POST /auth/otp/send {phone}                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                     OTP sent (987654)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ENTER OTP CODE                          │
│              POST /auth/{role}/otp-login {phone, code}          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    OTP verified locally
                             │
                  ┌──── phone exists? ────┐
                  │                       │
                 YES                      NO
                  │                       │
                  ▼                       ▼
          ┌──────────────┐    ┌────────────────────────┐
          │ Role matches │    │    Which role?          │
          │  expected?   │    └──┬──────┬──────────┬───┘
          └──┬───────┬───┘       │      │          │
            YES      NO     "user"  "business   "delivery
             │       │          │    Owner"     Partner"
             ▼       ▼          ▼      │          │
          ┌──────┐ ┌─────┐  CREATE     ▼          ▼
          │LOGIN │ │ 403 │  account  ┌──────┐  ┌──────────────────┐
          │tokens│ │wrong│  + tokens │ 404  │  │ 404 — No account │
          │issued│ │role │           │ Show │  │ Contact business  │
          └──────┘ └─────┘           │"Reg- │  │ owner to register │
                                     │ister"│  └──────────────────┘
                                     │ link │
                                     └──┬───┘
                                        │
                              User taps "Register"
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ OTP REGISTRATION   │
                              │ POST /auth/        │
                              │ businessowner/     │
                              │ otp-register       │
                              │                    │
                              │ {phone, otp,       │
                              │  societyId,        │
                              │  businessName,     │
                              │  businessCategory} │
                              └────────┬──────────┘
                                       │
                                       ▼
                              Account created
                              (pending admin verification)
```

---

## Resident (Customer)

```
Phone ──▶ OTP ──▶ Account auto-created ──▶ Select Society ──▶ Home
                         │
                  (if already exists)
                         │
                         ▼
                    Direct login ──▶ Home
```

**Self-service.** New phone = new account. No approval needed.
Resident fills in name and society after first login.

**Endpoints:**
- `POST /auth/otp/send` → `POST /auth/user/otp-login`
- `POST /auth/user/register` (email/password alternative)

---

## Business Owner

```
  ┌───────────────────────────────────────────────────────────────┐
  │                                                               │
  │  🆕  NEW REGISTRATION (via OTP)                               │
  │  ─────────────────────────────                                │
  │                                                               │
  │  Phone ──▶ OTP ──▶ Shop Details ──▶ Account created           │
  │                    (society,        (verificationStatus:       │
  │                     shop name,       pending)                  │
  │                     shop type)              │                  │
  │                                             ▼                 │
  │                                    "Application Received"     │
  │                                    Wait for admin approval    │
  │                                                               │
  │                                                               │
  │  🔄  RETURNING LOGIN                                          │
  │  ──────────────────                                           │
  │                                                               │
  │  Phone ──▶ OTP ──▶ ?                                          │
  │                     │                                         │
  │              ┌──────┴──────┐                                  │
  │              │             │                                  │
  │         Still pending   Verified ✅                            │
  │              │             │                                  │
  │              ▼             ▼                                  │
  │     "Application       Dashboard                              │
  │      Received"                                                │
  │                                                               │
  │  ❌ Phone not registered → Error banner + "Register" link     │
  │                                                               │
  │                                                               │
  │  🔓 GATES BEFORE SELLING                                      │
  │  ───────────────────────                                      │
  │                                                               │
  │  Gate 1: Admin verifies business (isVerified)                 │
  │  Gate 2: Owner adds their name (firstName)                    │
  │  Gate 3: Bank details verified (Cashfree penny-drop)          │
  │  Gate 4: Each product approved by admin                       │
  │                                                               │
  └───────────────────────────────────────────────────────────────┘
```

**Self-registers via OTP.** Minimal info: society, shop name, shop type. No password, email, or address needed upfront.

OTP login only works for existing accounts. Unregistered phone → error banner with "Register your shop" link.

**Endpoints:**
- `POST /auth/otp/send` → `POST /auth/businessowner/otp-register` (first time, with shop details)
- `POST /auth/otp/send` → `POST /auth/businessowner/otp-login` (returning)
- `POST /auth/businessowner/register` (legacy email/password registration)
- `PUT /auth/profile/me` (update name after registration)

---

## Delivery Partner

```
  Business Owner ──▶ Creates delivery partner account
                         (with partner's phone)
                                │
                                ▼
                ┌───────────────────────────────┐
                │  Partner logs in via OTP       │
                │  using pre-registered phone    │
                └───────────────────────────────┘
```

**Created by Business Owner only.** Cannot self-register.
Unregistered phone → `"No account found. Please contact your business owner to register."`

**Endpoints:**
- `POST /auth/otp/send` → `POST /auth/deliverypartner/otp-login`
- `POST /auth/deliverypartner/login` (email/password)

---

## Backend Architecture

```
Mobile App                          Backend (port 5001)
──────────                          ───────────────────

authService.sendLoginOTP(phone) ──▶ POST /auth/otp/send
                                         │
                                    otpStore.sendOTP()
                                    ┌──────────────────────┐
                                    │ In-memory Map         │
                                    │ phone → {code, time}  │
                                    │ Static: 987654 (dev)  │
                                    │ 5-min expiry          │
                                    │ 5 req / 10-min limit  │
                                    └──────────────────────┘

authService.loginWithOTP(         ──▶ POST /auth/{role}/otp-login
  phone, code, role)                     │
                                    otpStore.verifyOTP()
                                         │
                                    code match? ──▶ JWT tokens issued
                                                    (access + refresh)
```

**Key file:** `apps/backend/src/lib/otpStore.ts`

> When ready for production SMS/WhatsApp, replace `STATIC_OTP` with a real provider in `sendOTP()`. The rest of the flow stays the same.
