import { Router } from "express";
import { prisma } from "../lib/prisma";
import { societySchema } from "../shared/validation";
import { cascadeDeleteSociety } from "../services/cascadeDelete";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const [societies, businesses] = await Promise.all([
      prisma.society.findMany({ orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit }),
      prisma.business.findMany({ select: { societyId: true } }),
    ]);

    const businessCountMap: Record<string, number> = {};
    businesses.forEach((b) => {
      businessCountMap[b.societyId] = (businessCountMap[b.societyId] ?? 0) + 1;
    });

    const data = societies.map((s) => ({ ...s, totalBusinesses: businessCountMap[s.id] ?? 0 }));
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const society = await prisma.society.findUnique({ where: { id: req.params.id } });
    if (!society) return res.status(404).json({ success: false, error: "Society not found" });
    return res.json({ success: true, data: society });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const validated = societySchema.parse(req.body);
    const society = await prisma.society.create({ data: { ...validated, status: "active" } });
    res.status(201).json({ success: true, data: society });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const validated = societySchema.partial().parse(req.body);
    const society = await prisma.society.update({ where: { id: req.params.id }, data: validated });
    res.json({ success: true, data: society });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Cascading delete: businesses -> products/orders -> owner accounts -> society
router.delete("/:id", async (req, res) => {
  try {
    const summary = await cascadeDeleteSociety(req.params.id);
    return res.json({
      success: true,
      message: "Society and all associated businesses, products, orders, and owner accounts deleted",
      summary,
    });
  } catch (error: any) {
    if (error.message === "SOCIETY_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Society not found" });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
