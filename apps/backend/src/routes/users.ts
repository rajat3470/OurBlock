import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

function sanitize(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// NOTE: preserved without auth middleware to match legacy behavior — flagged
// in BACKEND_FLOW_DOCUMENTATION.md §9.1 item 2/3 as a pre-existing gap.
router.get("/", async (req, res) => {
  try {
    const { role, societyId, status = "active" } = req.query;
    const where: any = { status: status as string };
    if (role) where.role = role as string;
    if (societyId) where.societyId = societyId as string;

    const users = await prisma.user.findMany({ where });
    res.json({ success: true, data: users.map(sanitize) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    return res.json({ success: true, data: sanitize(user) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { passwordHash, ...updateData } = req.body;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: sanitize(user) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Duplicates of /auth/profile & /auth/addresses & /auth/verify-phone —
// kept for backward client compatibility (legacy code had two parallel
// implementations; see BACKEND_FLOW_DOCUMENTATION.md §3.13).
// ---------------------------------------------------------------------------
router.get("/profile/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.uid } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    return res.json({ id: user.id, ...sanitize(user) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/profile/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { email, password, role, createdAt, id, ...updateData } = req.body;
    const user = await prisma.user.update({ where: { id: req.uid }, data: updateData });
    return res.json({ id: user.id, ...sanitize(user) });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/addresses/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.uid },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return res.json(addresses);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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
      await prisma.address.updateMany({ where: { userId: req.uid, id: { not: req.params.addressId } }, data: { isDefault: false } });
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
    return res.status(500).json({ success: false, error: error.message });
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

router.post("/verify-phone/me", requireAuth, async (req: AuthedRequest, res) => {
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
// POST /users/fcm-token — kept for schema parity; FCM channel itself is dropped.
// ---------------------------------------------------------------------------
router.post("/fcm-token", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({ success: false, error: "fcmToken is required" });
    }
    await prisma.user.update({ where: { id: req.uid }, data: { fcmToken } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
