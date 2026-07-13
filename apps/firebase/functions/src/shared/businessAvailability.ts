export interface BusinessOrderEligibility {
  canPlaceOrder: boolean;
  reason?: string;
}

export const getBusinessOrderEligibility = (
  business: { name?: string; status?: string; isTakingOrders?: boolean } | null | undefined,
  owner?: { status?: string } | null
): BusinessOrderEligibility => {
  if (!business) {
    return { canPlaceOrder: false, reason: 'Business not found.' };
  }

  if (business.status !== 'active') {
    return {
      canPlaceOrder: false,
      reason: `${business.name ?? 'This vendor'} is not accepting orders right now. Please try again later.`,
    };
  }

  if (business.isTakingOrders === false) {
    return {
      canPlaceOrder: false,
      reason: `${business.name ?? 'This vendor'} is not accepting orders right now. Please try again later.`,
    };
  }

  if (owner?.status === 'suspended') {
    return {
      canPlaceOrder: false,
      reason: `${business.name ?? 'This vendor'} is not accepting orders right now. Please try again later.`,
    };
  }

  return { canPlaceOrder: true };
};
