import { Router } from "express";
import { prisma } from "../lib/prisma";
import { societySchema } from "../shared/validation";
import { cascadeDeleteSociety } from "../services/cascadeDelete";
import { Society as SocietyModel, Business } from "../models";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const cityFilter = typeof req.query.city === "string" ? req.query.city : undefined;

    const where: any = { status: "active" };
    if (cityFilter) where.city = cityFilter;

    const [societies, businessCounts] = await Promise.all([
      prisma.society.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit }),
      Business.aggregate([
        { $facet: {
          total: [
            { $group: { _id: "$societyId", count: { $sum: 1 } } },
          ],
          active: [
            { $match: { status: "active", isVerified: true } },
            { $group: { _id: "$societyId", count: { $sum: 1 } } },
          ],
        }},
      ]),
    ]);

    const totalMap: Record<string, number> = {};
    const activeMap: Record<string, number> = {};
    for (const row of businessCounts[0].total) totalMap[row._id] = row.count;
    for (const row of businessCounts[0].active) activeMap[row._id] = row.count;

    const data = societies.map((s) => ({
      ...s,
      totalBusinesses: totalMap[s.id] ?? 0,
      activeBusinesses: activeMap[s.id] ?? 0,
    }));
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/areas", async (_req, res) => {
  try {
    const areas = await SocietyModel.aggregate([
      { $match: { status: "active" } },
      { $group: {
        _id: "$city",
        state: { $first: "$state" },
        societyCount: { $sum: 1 },
      }},
      { $sort: { societyCount: -1, _id: 1 } },
    ]);
    const data = areas.map((a) => ({ city: a._id, state: a.state, societyCount: a.societyCount }));
    res.json({ success: true, data });
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
