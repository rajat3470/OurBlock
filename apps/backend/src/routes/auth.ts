import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken, generateRefreshTokenValue } from "../lib/jwt";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { registerSchema } from "../shared/validation";
import { normalizeRole } from "../shared/constants";
import { notifySystem } from "../lib/notifications";
import { ensureSocietyDemoCatalog, getSocietyProducts } from "../services/demoCatalog";
import { sendOTP, isRateLimited, verifyOTP } from "../lib/otpStore";

const router = Router();
const BCRYPT_ROUNDS = 10;

async function issueTokens(userId: string, role: string) {
  const { token: accessToken, expiresIn } = signAccessToken({ uid: userId, role });
  const { value: refreshToken, expiresAt } = generateRefreshTokenValue();
  await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });
  return { accessToken, refreshToken, expiresIn };
}

function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// POST /auth/register — generic register (defaults role=user)
// ---------------------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { role = "user" } = req.body;
    const validated = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: validated.email }, { phone: validated.phone }] },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email or phone already exists" });
    }

    const passwordHash = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        passwordHash,
        role,
        status: "active",
      },
    });

    await notifySystem(
      user.id,
      "Welcome to mohallaMitr!",
      "Thank you for joining our community. Start exploring local businesses in your society."
    );

    const tokens = await issueTokens(user.id, user.role);
    return res.status(201).json({ success: true, data: { user: sanitizeUser(user), tokens } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || "Registration failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/businessowner/register
// ---------------------------------------------------------------------------
router.post("/businessowner/register", async (req, res) => {
  try {
    const {
      firstName, lastName, email, password, phone, societyId,
      businessName, businessCategory, businessAddress, businessImageUrl,
    } = req.body;

    if (!firstName || !lastName || !email || !password || !phone || !societyId) {
      return res.status(400).json({
        success: false,
        error: "firstName, lastName, email, password, phone and societyId are all required",
      });
    }
    if (!businessName || !businessCategory || !businessAddress) {
      return res.status(400).json({
        success: false,
        error: "businessName, businessCategory and businessAddress are all required",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
    }

    const society = await prisma.society.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ success: false, error: "Society not found" });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email or phone already exists" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName, lastName, email, phone, passwordHash,
          role: "businessOwner",
          societyId,
          status: "active",
          verificationStatus: "pending",
          mustChangePassword: false,
        },
      });

      const business = await tx.business.create({
        data: {
          name: businessName,
          category: businessCategory,
          address: businessAddress,
          phone,
          email,
          ownerId: user.id,
          societyId,
          status: "active",
          isVerified: false,
          imageUrl: typeof businessImageUrl === "string" ? businessImageUrl : null,
        },
      });

      return { user, business };
    });

    const tokens = await issueTokens(result.user.id, "businessOwner");
    return res.status(201).json({
      user: { ...sanitizeUser(result.user), businessId: result.business.id },
      tokens,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || "Registration failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/businessowner/otp-register — register via OTP (minimal fields)
// ---------------------------------------------------------------------------
router.post("/businessowner/otp-register", async (req, res) => {
  try {
    const { phone, otp, societyId, businessName, businessCategory } = req.body;

    if (!phone || !otp || !societyId || !businessName || !businessCategory) {
      return res.status(400).json({
        success: false,
        error: "phone, otp, societyId, businessName and businessCategory are all required",
      });
    }

    const otpOk = verifyOTP(phone, otp);
    if (!otpOk) {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP" });
    }

    const society = await prisma.society.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ success: false, error: "Society not found" });

    const existing = await prisma.user.findFirst({ where: { phone } });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this phone number already exists" });
    }

    const passwordHash = await bcrypt.hash("otp-registered", BCRYPT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: "",
          lastName: "",
          phone,
          passwordHash,
          role: "businessOwner",
          societyId,
          status: "active",
          verificationStatus: "pending",
          isPhoneVerified: true,
          mustChangePassword: false,
        },
      });

      const business = await tx.business.create({
        data: {
          name: businessName,
          category: businessCategory,
          address: "",
          phone,
          ownerId: user.id,
          societyId,
          status: "active",
          isVerified: false,
          isTakingOrders: false,
        },
      });

      return { user, business };
    });

    const tokens = await issueTokens(result.user.id, "businessOwner");
    return res.status(201).json({
      success: true,
      user: { ...sanitizeUser(result.user), businessId: result.business.id },
      tokens,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || "Registration failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/user/register — resident self-registration
// ---------------------------------------------------------------------------
router.post("/user/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, societyId } = req.body;

    if (!firstName || !lastName || !email || !password || !phone || !societyId) {
      return res.status(400).json({
        success: false,
        error: "firstName, lastName, email, password, phone and societyId are all required",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
    }

    const society = await prisma.society.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ success: false, error: "Society not found" });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email or phone already exists" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { firstName, lastName, email, phone, passwordHash, role: "user", societyId, status: "active" },
    });

    const tokens = await issueTokens(user.id, "user");
    return res.status(201).json({ user: sanitizeUser(user), tokens });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || "Registration failed" });
  }
});

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------
router.post("/change-password", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: req.uid },
      data: { passwordHash, mustChangePassword: false },
    });
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/me — session restore
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.uid } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (user.status === "suspended") {
      return res.status(403).json({ success: false, error: "Your account has been suspended", code: "ACCOUNT_SUSPENDED" });
    }
    return res.json({ success: true, data: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(401).json({ success: false, error: error.message || "Unauthorized" });
  }
});

router.get("/profile/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.uid } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    return res.json(sanitizeUser(user));
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/profile/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { email, password, role, createdAt, id, ...updateData } = req.body;
    const user = await prisma.user.update({ where: { id: req.uid }, data: updateData });
    return res.json(sanitizeUser(user));
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Address management
// ---------------------------------------------------------------------------
router.get("/addresses/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.uid },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return res.json(addresses);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/addresses/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { type, name, street, landmark, city, state, pincode, phone, isDefault } = req.body;
    if (!type || !street || !city || !state || !pincode || !phone) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.uid }, data: { isDefault: false } });
    }

    const address = await prisma.address.create({
      data: { userId: req.uid!, type, name, street, landmark, city, state, pincode, phone, isDefault: !!isDefault },
    });
    return res.status(201).json(address);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/addresses/:addressId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.addressId, userId: req.uid } });
    if (!existing) return res.status(404).json({ success: false, error: "Address not found" });

    const { id, userId, createdAt, ...updateData } = req.body;
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.uid, id: { not: req.params.addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({ where: { id: req.params.addressId }, data: updateData });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/addresses/:addressId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.addressId, userId: req.uid } });
    if (!existing) return res.status(404).json({ success: false, error: "Address not found" });
    await prisma.address.delete({ where: { id: req.params.addressId } });
    return res.json({ success: true, message: "Address deleted successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/addresses/:addressId/set-default", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.addressId, userId: req.uid } });
    if (!existing) return res.status(404).json({ success: false, error: "Address not found" });

    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: req.uid }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: req.params.addressId }, data: { isDefault: true } }),
    ]);

    const updated = await prisma.address.findUnique({ where: { id: req.params.addressId } });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Phone verification (client-verified OTP; server just flips the flag)
// ---------------------------------------------------------------------------
router.post("/verify-phone", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { code, verificationId } = req.body;
    if (!code || !verificationId) {
      return res.status(400).json({ success: false, error: "Code and verificationId are required" });
    }
    await prisma.user.update({ where: { id: req.uid }, data: { isPhoneVerified: true } });
    return res.json({ success: true, message: "Phone verified successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/home-feed
// ---------------------------------------------------------------------------
router.get("/home-feed", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.uid } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const requestedSocietyId = typeof req.query.societyId === "string" ? req.query.societyId : undefined;
    const societyId = requestedSocietyId || user.societyId;
    if (!societyId) return res.status(400).json({ success: false, error: "Society not selected for user" });

    await ensureSocietyDemoCatalog(societyId);

    const allBusinesses = await prisma.business.findMany({
      where: { societyId, status: "active", isVerified: true },
    });
    const allBusinessIds = allBusinesses.map((b) => b.id);
    const products = await getSocietyProducts(allBusinessIds);

    // Only show businesses that have at least one approved product AND (bank verified OR demo)
    const bizWithApprovedProduct = new Set(products.map((p) => p.businessId));
    const businesses = allBusinesses.filter((b) => {
      if (!bizWithApprovedProduct.has(b.id)) return false;
      if ((b as any).isDemo) return true;
      return (b as any).bankDetails?.verificationStatus === "verified";
    });
    const businessIds = businesses.map((b) => b.id);

    const activeOrderStatuses = new Set(["pending", "confirmed", "preparing", "ready", "outForDelivery"]);
    const orders = await prisma.order.findMany({ where: { userId: req.uid }, take: 100 });
    const activeOrders = orders.filter((o) => activeOrderStatuses.has(o.status)).length;

    const categoryMap = new Map<string, number>();
    businesses.forEach((b) => {
      const key = String(b.category || "other").toLowerCase();
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + 1);
    });
    const categories = Array.from(categoryMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    const featuredProducts = [...products]
      .sort((a, b) => {
        const discountDiff = Number(b.discount || 0) - Number(a.discount || 0);
        if (discountDiff !== 0) return discountDiff;
        return Number(b.rating || 0) - Number(a.rating || 0);
      })
      .slice(0, 20);

    const topRatedBusinesses = [...businesses].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 10);
    const offerProducts = featuredProducts.filter((p) => Number(p.discount || 0) > 0).slice(0, 10);

    const nowMs = Date.now();
    const banners = await prisma.homeBanner.findMany({ where: { isActive: true } });
    const filteredBanners = banners
      .filter((banner) => {
        const targetSociety = String(banner.societyId || "global");
        if (targetSociety !== "global" && targetSociety !== societyId) return false;
        if (banner.startAt && nowMs < banner.startAt.getTime()) return false;
        if (banner.endAt && nowMs > banner.endAt.getTime()) return false;
        return true;
      })
      .sort((a, b) => {
        const orderA = a.sortOrder ?? 100;
        const orderB = b.sortOrder ?? 100;
        if (orderA !== orderB) return orderA - orderB;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, 6);

    return res.json({
      societyId,
      stats: {
        totalBusinesses: businesses.length,
        activeOrders,
        favoriteCount: user.favoriteBusinesses?.length ?? 0,
      },
      categories,
      businesses,
      featuredProducts,
      topRatedBusinesses,
      offerProducts,
      banners: filteredBanners,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to load home feed" });
  }
});

// ---------------------------------------------------------------------------
// OTP-based login (unauthenticated)
// ---------------------------------------------------------------------------

// POST /auth/otp/send — send OTP for login (no auth required)
router.post("/otp/send", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });

    if (isRateLimited(phone)) {
      return res.status(429).json({ success: false, error: "Too many attempts. Please try again later." });
    }

    const result = await sendOTP(phone);
    if (!result.ok) {
      return res.status(500).json({ success: false, error: result.error });
    }

    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Shared OTP login handler — verifies OTP, finds or creates user with the given role
async function otpLoginForRole(
  req: any,
  res: any,
  expectedRole: "user" | "businessOwner" | "deliveryPartner"
) {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, error: "Phone and code are required" });
  }

  const otpResult = await verifyOTP(phone, code);
  if (!otpResult.ok) {
    return res.status(400).json({ success: false, error: otpResult.error });
  }

  // Try exact match first, then alternate format (handles legacy records stored without +91)
  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    let altPhone = phone;
    if (phone.startsWith("+91") && phone.length === 13) {
      altPhone = phone.slice(3); // +919779850058 → 9779850058
    } else if (/^[6-9]\d{9}$/.test(phone)) {
      altPhone = `+91${phone}`; // 9779850058 → +919779850058
    }
    if (altPhone !== phone) {
      user = await prisma.user.findFirst({ where: { phone: altPhone } });
      if (user) {
        // Normalize the stored phone to E.164 for future lookups
        const e164 = phone.startsWith("+91") ? phone : `+91${phone}`;
        await prisma.user.update({ where: { id: user.id }, data: { phone: e164 } });
        user.phone = e164;
      }
    }
  }

  if (user && normalizeRole(user.role) !== expectedRole) {
    return res.status(403).json({
      success: false,
      error: "This phone number is registered with a different role. Please use the correct login.",
    });
  }

  if (user && user.status === "suspended") {
    return res.status(403).json({ success: false, error: "Your account has been suspended" });
  }

  if (!user && expectedRole === "deliveryPartner") {
    return res.status(404).json({
      success: false,
      error: "No account found with this phone number. Please contact your business owner to register.",
    });
  }

  if (!user && expectedRole === "businessOwner") {
    return res.status(404).json({
      success: false,
      error: "No account found with this phone number. Please contact the mohallaMitr admin team to register.",
    });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        role: "user",
        status: "active",
        isPhoneVerified: true,
      },
    });

    await notifySystem(
      user.id,
      "Welcome to mohallaMitr!",
      "Thank you for joining our community."
    );
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });
  }

  const tokens = await issueTokens(user.id, user.role);
  return res.json({ user: sanitizeUser(user), tokens });
}

router.post("/user/otp-login", (req, res, next) => otpLoginForRole(req, res, "user").catch(next));
router.post("/businessowner/otp-login", (req, res, next) => otpLoginForRole(req, res, "businessOwner").catch(next));
router.post("/deliverypartner/otp-login", (req, res, next) => otpLoginForRole(req, res, "deliveryPartner").catch(next));

// ---------------------------------------------------------------------------
// Role-gated login
// ---------------------------------------------------------------------------
async function loginWithRole(req: any, res: any, expectedRole: "superAdmin" | "businessOwner" | "user" | "deliveryPartner") {
  console.log(`[${expectedRole}] login attempt for email: ${req.body?.email}`)
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ success: false, error: "Invalid email or password" });

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) return res.status(401).json({ success: false, error: "Invalid email or password" });

  if (user.disabled) return res.status(403).json({ success: false, error: "This account has been suspended" });

  let normalizedRole = normalizeRole(user.role);

  // Repair legacy business-owner accounts with a stale role value.
  if (expectedRole === "businessOwner" && normalizedRole !== "businessOwner") {
    const ownedBusiness = await prisma.business.findUnique({ where: { ownerId: user.id } });
    if (ownedBusiness) {
      normalizedRole = "businessOwner";
      await prisma.user.update({ where: { id: user.id }, data: { role: "businessOwner" } });
    }
  }

  if (normalizedRole !== expectedRole) {
    return res.status(403).json({ success: false, error: `This login is for ${expectedRole} accounts only` });
  }

  if (user.status === "suspended") {
    if (expectedRole === "businessOwner") {
      const ownedBusiness = await prisma.business.findUnique({ where: { ownerId: user.id } });
      if (ownedBusiness?.suspendedAt) {
        return res.status(403).json({
          success: false,
          error: "Your account has been blocked due to repeated order rejections. Please contact the admin to unblock your account.",
          code: "ACCOUNT_SUSPENDED",
        });
      }
    }
    return res.status(403).json({ success: false, error: "Your account has been suspended" });
  }

  if (user.status === "inactive") {
    return res.status(403).json({ success: false, error: "Your account is inactive. Contact the business owner." });
  }

  const tokens = await issueTokens(user.id, user.role);
  return res.json({ user: sanitizeUser(user), tokens });
}

router.post("/superadmin/login", (req, res, next) => loginWithRole(req, res, "superAdmin").catch(next));
router.post("/businessowner/login", (req, res, next) => loginWithRole(req, res, "businessOwner").catch(next));
router.post("/user/login", (req, res, next) => loginWithRole(req, res, "user").catch(next));
router.post("/deliverypartner/login", (req, res, next) => loginWithRole(req, res, "deliveryPartner").catch(next));

// ---------------------------------------------------------------------------
// POST /auth/refresh-token
// ---------------------------------------------------------------------------
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.body?.refreshToken || req.body?.refresh_token || req.headers.authorization?.split("Bearer ")[1];
  if (!refreshToken) return res.status(400).json({ success: false, error: "refreshToken is required" });

  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: "Session expired. Please sign in again.", code: "TOKEN_REFRESH_FAILED" });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return res.status(401).json({ success: false, error: "Session expired. Please sign in again." });
    if (user.status === "suspended") {
      return res.status(403).json({ success: false, error: "Your account has been suspended", code: "ACCOUNT_SUSPENDED" });
    }

    const { token: accessToken, expiresIn } = signAccessToken({ uid: user.id, role: user.role });
    return res.json({
      user: sanitizeUser(user),
      tokens: { accessToken, refreshToken, expiresIn },
    });
  } catch (error: any) {
    return res.status(503).json({ success: false, error: error.message || "Token refresh temporarily unavailable", code: "REFRESH_UNAVAILABLE" });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout — revoke refresh token + clear push token
// ---------------------------------------------------------------------------
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { revoked: true } }).catch(() => undefined);
    }
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (token) {
      try {
        const { verifyAccessToken } = await import("../lib/jwt");
        const decoded = verifyAccessToken(token);
        await prisma.user.update({ where: { id: decoded.uid }, data: { pushToken: null } });
      } catch {
        /* access token may already be expired — local logout still succeeds */
      }
    }
    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
});

// ---------------------------------------------------------------------------
// PUT /auth/push-token
// ---------------------------------------------------------------------------
router.put("/push-token", requireAuth, async (req: AuthedRequest, res) => {
  const { pushToken } = req.body;
  if (!pushToken || typeof pushToken !== "string") {
    return res.status(400).json({ success: false, error: "pushToken is required" });
  }
  try {
    await prisma.user.update({ where: { id: req.uid }, data: { pushToken } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
