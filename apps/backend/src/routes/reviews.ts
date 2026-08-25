import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

async function updateAggregateRating(target: "businesses" | "products", id: string) {
  const where = target === "businesses" ? { businessId: id, status: "approved" as const } : { productId: id, status: "approved" as const };
  const reviews = await prisma.review.findMany({ where });
  if (reviews.length === 0) return;

  const total = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0);
  const avg = Math.round((total / reviews.length) * 10) / 10;

  if (target === "businesses") {
    await prisma.business.update({ where: { id }, data: { rating: avg, totalReviews: reviews.length } });
  } else {
    await prisma.product.update({ where: { id }, data: { rating: avg, totalReviews: reviews.length } });
  }
}

router.get("/", async (req, res) => {
  try {
    const { businessId, productId } = req.query;
    if (!businessId && !productId) return res.status(400).json({ success: false, error: "businessId or productId is required" });

    const where: any = { status: "approved" };
    if (businessId) where.businessId = businessId as string;
    else if (productId) where.productId = productId as string;

    const reviews = await prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 });
    return res.json({ success: true, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { businessId, productId, orderId, rating, title, comment } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: "orderId is required" });
    if (!businessId && !productId) return res.status(400).json({ success: false, error: "businessId or productId is required" });
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: "rating must be between 1 and 5" });
    }
    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ success: false, error: "comment must be at least 5 characters" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.userId !== req.uid) return res.status(403).json({ success: false, error: "Not your order" });
    if (order.status !== "delivered") return res.status(400).json({ success: false, error: "Can only review delivered orders" });

    const dup = await prisma.review.findFirst({
      where: businessId ? { orderId, businessId } : { orderId, productId },
    });
    if (dup) return res.status(409).json({ success: false, error: "You have already reviewed this order" });

    const review = await prisma.review.create({
      data: {
        userId: req.uid!,
        orderId,
        rating,
        comment: comment.trim(),
        title: title?.trim() ?? null,
        verified: true,
        status: "approved",
        businessId: businessId ?? null,
        productId: productId ?? null,
      },
    });

    if (businessId) await updateAggregateRating("businesses", businessId);
    if (productId) await updateAggregateRating("products", productId);

    return res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
