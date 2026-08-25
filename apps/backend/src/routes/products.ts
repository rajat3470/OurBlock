import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// NOTE: preserved without auth middleware to match legacy behavior. Always
// filters out unverified products regardless of caller.
router.get("/", async (req, res) => {
  try {
    const { businessId, category, status = "active" } = req.query;
    const where: any = { status: status as string };
    if (businessId) where.businessId = businessId as string;
    if (category) where.category = category as string;

    const products = await prisma.product.findMany({ where });
    const filtered = products.filter((p) => p.isVerified === true || p.approvalStatus === "approved");
    res.json({ success: true, data: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });
    return res.json({ success: true, data: product });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const product = await prisma.product.create({ data: { ...req.body, status: "active" } });
    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
