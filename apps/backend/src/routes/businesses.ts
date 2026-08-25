import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// NOTE: preserved without auth middleware to match legacy behavior (see
// BACKEND_FLOW_DOCUMENTATION.md §9.1 item 2). The "official" owner-gated path
// is /owner/products & /owner/business/*.
router.get("/", async (req, res) => {
  try {
    const { societyId, category, status = "active" } = req.query;
    const where: any = { status: status as string };
    if (societyId) where.societyId = societyId as string;
    if (category) where.category = category as string;

    const businesses = await prisma.business.findMany({ where });
    res.json({ success: true, data: businesses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });
    return res.json({ success: true, data: business });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const business = await prisma.business.create({
      data: { ...req.body, status: "active", isVerified: false },
    });
    res.status(201).json({ success: true, data: business });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const business = await prisma.business.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.business.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Business deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
