import { useEffect, useRef } from "react";
import { useAppSelector } from "@hooks/useRedux";
import { OrderStatus } from "@/types";
import { toMillis } from "@utils/orderAcceptance";
import { presentOwnerNewOrderNotification } from "@services/orderNotificationService";

/**
 * When a new pending order appears in Redux (Firestore realtime sync), show a
 * local notification. Works on iOS Simulator where remote OneSignal/APNs
 * delivery is unreliable.
 */
export function useOwnerLocalOrderAlerts() {
  const orders = useAppSelector((s) => s.businessOwner.orders);
  const prevPendingCount = useRef(0);
  const hydrated = useRef(false);

  useEffect(() => {
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
    const pendingCount = pendingOrders.length;

    if (pendingCount > prevPendingCount.current && hydrated.current) {
      const newest = [...pendingOrders].sort((a, b) => {
        const aMs = toMillis((a as any).createdAt) ?? 0;
        const bMs = toMillis((b as any).createdAt) ?? 0;
        return bMs - aMs;
      })[0];

      if (newest) {
        const orderRef = String(newest.id).substring(0, 8).toUpperCase();
        void presentOwnerNewOrderNotification(
          "🔔 New Order!",
          `Order #${orderRef} — Rs ${(newest as any).finalAmount ?? ""}`,
          {
            orderId: newest.id,
            status: "pending",
            action: "review",
          }
        );
      }
    }

    hydrated.current = true;
    prevPendingCount.current = pendingCount;
  }, [orders]);
}
