import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/sessions", async (req: AuthedRequest, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { OR: [{ userId: req.uid }, { businessOwnerId: req.uid }] },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });
    return res.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error("List chat sessions error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/sessions", async (req: AuthedRequest, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ success: false, error: "businessId is required" });

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });
    if (!business.ownerId) return res.status(400).json({ success: false, error: "Business has no owner" });

    const existing = await prisma.chatSession.findUnique({ where: { businessId_userId: { businessId, userId: req.uid! } } });
    if (existing) return res.json({ success: true, data: existing });

    const session = await prisma.chatSession.create({
      data: { businessId, userId: req.uid!, businessOwnerId: business.ownerId, businessName: business.name || "" },
    });
    return res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    console.error("Create chat session error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/sessions/:id", async (req: AuthedRequest, res) => {
  try {
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });
    if (session.userId !== req.uid && session.businessOwnerId !== req.uid) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    return res.json({ success: true, data: session });
  } catch (error: any) {
    console.error("Get chat session error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/sessions/:id/messages", async (req: AuthedRequest, res) => {
  try {
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });
    if (session.userId !== req.uid && session.businessOwnerId !== req.uid) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const messages = await prisma.message.findMany({
      where: { chatSessionId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json({ success: true, data: messages.reverse() });
  } catch (error: any) {
    console.error("List messages error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/sessions/:id/messages", async (req: AuthedRequest, res) => {
  try {
    const { content, type = "text" } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: "content is required" });
    }

    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });

    const participants = [session.userId, session.businessOwnerId];
    if (!participants.includes(req.uid!)) return res.status(403).json({ success: false, error: "Access denied" });
    const receiverId = participants.find((id) => id !== req.uid) || "";

    const message = await prisma.message.create({
      data: { chatSessionId: session.id, senderId: req.uid!, receiverId, content: content.trim(), type },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { lastMessage: { senderId: req.uid, content: content.trim(), type, createdAt: message.createdAt.toISOString() }, lastMessageAt: new Date() },
    });

    return res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
