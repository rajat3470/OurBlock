import http from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "./jwt";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Socket.IO real-time layer — provides per-user, per-order, per-business and
// per-society rooms so the frontend receives instant updates without polling.
// ---------------------------------------------------------------------------

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO has not been initialised");
  return io;
}

export function createSocketServer(httpServer: http.Server): Server {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // -- Authentication middleware --
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error("Authentication token missing"));

    try {
      const payload = verifyAccessToken(token);
      (socket as any).data = { userId: payload.uid, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // -- Connection handler --
  io.on("connection", (socket: Socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };

    // Always join user-specific room
    socket.join(`user:${userId}`);

    // Role-based default rooms
    if (role === "businessOwner") {
      const businessId =
        (socket.handshake.auth as any).businessId as string | undefined;
      if (businessId) socket.join(`business:${businessId}`);
    }

    if (role === "deliveryPartner") {
      socket.join(`delivery:${userId}`);
    }

    // -- Dynamic room subscriptions (with authorization) --

    socket.on("join:order", async (data: string | { orderId?: string }) => {
      const orderId = typeof data === "string" ? data : data?.orderId;
      if (!orderId) return;
      try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return;
        const isParticipant =
          order.userId === userId ||
          order.assignedDeliveryPartnerId === userId;
        if (!isParticipant) {
          // Check if the user is the business owner
          const business = await prisma.business.findUnique({ where: { id: order.businessId } });
          if (!business || business.ownerId !== userId) return;
        }
        socket.join(`order:${orderId}`);
      } catch {
        // Silently deny on error
      }
    });

    socket.on("join:business", (data: string | { businessId?: string }) => {
      const businessId = typeof data === "string" ? data : data?.businessId;
      if (businessId) socket.join(`business:${businessId}`);
    });

    socket.on("join:society", (data: string | { societyId?: string }) => {
      const societyId = typeof data === "string" ? data : data?.societyId;
      if (societyId) socket.join(`society:${societyId}`);
    });

    socket.on("join:user-orders", (data: { userId?: string }) => {
      // Only allow subscribing to own orders
      if (data?.userId && data.userId !== userId) return;
      socket.join(`user-orders:${userId}`);
    });

    socket.on("join:business-orders", async (data: { businessId?: string }) => {
      if (!data?.businessId) return;
      // Verify the user owns this business or is a delivery partner linked to it
      try {
        if (role === "businessOwner") {
          const business = await prisma.business.findUnique({ where: { id: data.businessId } });
          if (!business || business.ownerId !== userId) return;
        } else if (role === "deliveryPartner") {
          const partner = await prisma.user.findUnique({ where: { id: userId } });
          if (!partner || partner.businessId !== data.businessId) return;
        } else {
          return;
        }
        socket.join(`business-orders:${data.businessId}`);
      } catch {
        // Silently deny on error
      }
    });

    socket.on("join:delivery-orders", (data: { partnerId?: string }) => {
      // Only allow subscribing to own delivery orders
      if (data?.partnerId && data.partnerId !== userId) return;
      socket.join(`delivery-orders:${userId}`);
    });

    socket.on("disconnect", () => {
      // Cleanup is automatic; Socket.IO removes from all rooms on disconnect.
    });
  });

  return io;
}

// ---------------------------------------------------------------------------
// Helper emitters — usable from any service/route after initialisation.
// ---------------------------------------------------------------------------

/**
 * Broadcast a single order update to all interested rooms.
 * Optionally notify a previous delivery partner whose assignment was removed.
 */
export function emitOrderUpdate(orderId: string, order: any, previousDeliveryPartnerId?: string): void {
  const s = getIO();
  s.to(`order:${orderId}`).emit("order:updated", order);
  if (order.userId) s.to(`user-orders:${order.userId}`).emit("orders:user:updated", order);
  if (order.businessId) s.to(`business-orders:${order.businessId}`).emit("orders:business:updated", order);
  if (order.assignedDeliveryPartnerId) {
    s.to(`delivery-orders:${order.assignedDeliveryPartnerId}`).emit("orders:delivery:updated", order);
  }
  // Notify previous delivery partner so their UI removes the order
  if (previousDeliveryPartnerId && previousDeliveryPartnerId !== order.assignedDeliveryPartnerId) {
    s.to(`delivery-orders:${previousDeliveryPartnerId}`).emit("orders:delivery:updated", order);
  }
}

export function emitBusinessUpdate(businessId: string, business: any): void {
  const s = getIO();
  s.to(`business:${businessId}`).emit("business:updated", business);
  if (business.societyId) s.to(`society:${business.societyId}`).emit("businesses:society:updated", business);
}

export function emitToUser(userId: string, event: string, data: any): void {
  getIO().to(`user:${userId}`).emit(event, data);
}
