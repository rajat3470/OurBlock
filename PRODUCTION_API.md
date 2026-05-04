# 🚀 Production API - OurBlock

**Deployed:** May 4, 2026  
**Status:** ✅ Live

---

## 🔗 Base URL

```
https://us-central1-our-block-app.cloudfunctions.net/api
```

Use this URL for all API requests from your mobile and web apps.

---

## 📝 Quick Reference

### Authentication

#### Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",
  "phoneNumber": "+1234567890",
  "role": "customer"  # or "business_owner" or "super_admin"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "uid": "firebase-user-id"
}
```

#### Get Current User
```bash
GET /auth/me
Authorization: Bearer <firebase-id-token>
```

---

### Societies

#### List All Societies
```bash
GET /societies
```

#### Get Society by ID
```bash
GET /societies/:id
```

#### Create Society (Super Admin only)
```bash
POST /societies
Content-Type: application/json

{
  "name": "Green Valley Society",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "contactPerson": {
    "name": "Admin Name",
    "phone": "+91-9876543210",
    "email": "admin@example.com"
  }
}
```

---

### Businesses

#### List All Businesses
```bash
GET /businesses
# Optional query: ?societyId=society123
```

#### Get Business by ID
```bash
GET /businesses/:id
```

#### Create Business
```bash
POST /businesses
Content-Type: application/json

{
  "name": "Fresh Mart",
  "description": "Local grocery store",
  "category": "grocery",
  "societyId": "society123",
  "ownerId": "user123",
  "contactInfo": {
    "phone": "+91-9876543210",
    "email": "freshmart@example.com"
  },
  "address": {
    "street": "Shop 5, Block A",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

#### Update Business
```bash
PUT /businesses/:id
Content-Type: application/json

{
  "name": "Fresh Mart Updated",
  "isVerified": true
}
```

#### Delete Business
```bash
DELETE /businesses/:id
```

---

### Products

#### List All Products
```bash
GET /products
# Optional query: ?businessId=business123
```

#### Get Product by ID
```bash
GET /products/:id
```

#### Create Product
```bash
POST /products
Content-Type: application/json

{
  "name": "Fresh Apples",
  "description": "Organic apples from local farms",
  "category": "fruits",
  "price": 150,
  "unit": "kg",
  "businessId": "business123",
  "images": ["https://..."],
  "stock": 100
}
```

#### Update Product
```bash
PUT /products/:id
Content-Type: application/json

{
  "price": 160,
  "stock": 80
}
```

#### Delete Product
```bash
DELETE /products/:id
```

---

### Orders

#### List All Orders
```bash
GET /orders
# Optional query: ?userId=user123 or ?businessId=business123
```

#### Get Order by ID
```bash
GET /orders/:id
```

#### Create Order
```bash
POST /orders
Content-Type: application/json

{
  "userId": "user123",
  "businessId": "business123",
  "items": [
    {
      "productId": "product123",
      "quantity": 2,
      "price": 150,
      "subtotal": 300
    }
  ],
  "totalAmount": 300,
  "deliveryAddress": {
    "street": "Flat 101, Building A",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

#### Update Order
```bash
PUT /orders/:id
Content-Type: application/json

{
  "status": "confirmed"  # or "preparing", "ready", "delivered", "cancelled"
}
```

---

### Users

#### List All Users
```bash
GET /users
```

#### Get User by ID
```bash
GET /users/:id
```

#### Update User
```bash
PUT /users/:id
Content-Type: application/json

{
  "displayName": "Updated Name",
  "phoneNumber": "+91-9999999999"
}
```

---

## 🔐 Authentication

All endpoints except registration and login require a Firebase ID token in the Authorization header:

```bash
Authorization: Bearer <firebase-id-token>
```

Get the ID token from Firebase Auth SDK:
```javascript
const token = await user.getIdToken();
```

---

## 📊 Response Format

All endpoints return JSON in this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 💡 Integration Examples

### React Native (Mobile)
```javascript
const API_BASE_URL = 'https://us-central1-our-block-app.cloudfunctions.net/api';

// Register user
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    displayName: 'John Doe',
    role: 'customer'
  })
});

const result = await response.json();
```

### Next.js (Web)
```javascript
const API_BASE_URL = 'https://us-central1-our-block-app.cloudfunctions.net/api';

// Get all societies
export async function getSocieties() {
  const response = await fetch(`${API_BASE_URL}/societies`);
  const data = await response.json();
  return data.data;
}
```

---

## 🧪 Testing with cURL

### Test User Registration
```bash
curl -X POST https://us-central1-our-block-app.cloudfunctions.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ourblock.com",
    "password": "Test123!",
    "displayName": "Test User",
    "phoneNumber": "+1234567890",
    "role": "customer"
  }'
```

### Test Get Societies
```bash
curl https://us-central1-our-block-app.cloudfunctions.net/api/societies
```

### Test Create Business
```bash
curl -X POST https://us-central1-our-block-app.cloudfunctions.net/api/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Store",
    "description": "A test store",
    "category": "grocery",
    "societyId": "society-id-here",
    "ownerId": "user-id-here",
    "contactInfo": {
      "phone": "+91-9876543210",
      "email": "test@store.com"
    },
    "address": {
      "street": "Shop 1",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

---

## 🔍 Monitoring

**Firebase Console:**  
https://console.firebase.google.com/project/our-block-app/functions

**View Logs:**
```bash
firebase functions:log
```

**Usage & Billing:**  
https://console.firebase.google.com/project/our-block-app/usage

---

## 🚨 Important Notes

1. **Rate Limits:** Firebase Functions free tier includes 2M invocations/month
2. **CORS:** Already configured for all origins (*)
3. **Authentication:** Firebase Auth is enabled with Email/Password provider
4. **Database:** Firestore security rules are deployed
5. **Triggers:** Background functions for notifications are active

---

## 📞 Support

For issues or questions, check:
- [Firebase Console](https://console.firebase.google.com/project/our-block-app)
- [Function Logs](https://console.firebase.google.com/project/our-block-app/functions/logs)
- Local documentation: [DEVELOPMENT.md](./DEVELOPMENT.md)

---

**Last Updated:** May 4, 2026  
**Deployed By:** ankushrishi5@gmail.com
