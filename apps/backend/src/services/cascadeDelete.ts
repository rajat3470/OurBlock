import { prisma } from "../lib/prisma";

/**
 * Cascading delete for a society: businesses -> products/orders -> owner
 * accounts -> society. Ported from the legacy societies.ts route + the
 * redundant onSocietyDelete Firestore trigger (now consolidated into one
 * authoritative implementation since there is no separate trigger runtime).
 */
export async function cascadeDeleteSociety(
  societyId: string
): Promise<{ businessesDeleted: number; ownerAccountsDeleted: number }> {
  const society = await prisma.society.findUnique({ where: { id: societyId } });
  if (!society) throw new Error("SOCIETY_NOT_FOUND");

  const businesses = await prisma.business.findMany({ where: { societyId } });
  const businessIds = businesses.map((b) => b.id);

  if (businessIds.length > 0) {
    await prisma.orderItem.deleteMany({ where: { order: { businessId: { in: businessIds } } } });
    await prisma.order.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.product.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.coupon.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.review.deleteMany({ where: { businessId: { in: businessIds } } });
  }

  const ownerUsers = await prisma.user.findMany({ where: { societyId, role: "businessOwner" } });

  if (businessIds.length > 0) {
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
  }

  if (ownerUsers.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: ownerUsers.map((u) => u.id) } } });
  }

  await prisma.society.delete({ where: { id: societyId } });

  return { businessesDeleted: businesses.length, ownerAccountsDeleted: ownerUsers.length };
}
