import { Business } from "@/types";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type BusinessLiveStatus = "open" | "paused" | "closed";

/**
 * Derives a business's live status from its active flag, operating hours, and
 * whether it is currently accepting orders.
 */
export function getBusinessStatus(business: Business): BusinessLiveStatus {
  if (business.status !== "active") return "closed";

  let withinHours = true;
  if (business.operatingHours) {
    const now = new Date();
    const dayKey = DAYS[now.getDay()];
    const hours = business.operatingHours[dayKey];
    if (!hours || hours.isClosed) {
      withinHours = false;
    } else {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      withinHours = currentTime >= hours.open && currentTime < hours.close;
    }
  }

  if (!withinHours) return "closed";
  if (business.isTakingOrders === false) return "paused";
  return "open";
}
