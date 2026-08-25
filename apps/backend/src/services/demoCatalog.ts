import { prisma } from "../lib/prisma";

// Ported verbatim from apps/firebase/functions/src/api/auth.ts —
// auto-seeds a demo catalog the first time a society has zero active businesses.
const HOME_BUSINESS_SEEDS = [
  {
    name: "DailyFresh Mart",
    category: "grocery",
    description: "Fresh groceries and daily essentials delivered fast.",
    addressSuffix: "Central Plaza, Main Gate",
    phone: "9876501001",
    rating: 4.6,
    totalReviews: 248,
  },
  {
    name: "Spice Route Kitchen",
    category: "restaurant",
    description: "North Indian and street food favorites.",
    addressSuffix: "Food Court, Block B",
    phone: "9876501002",
    rating: 4.4,
    totalReviews: 196,
  },
  {
    name: "MediTrust Pharmacy",
    category: "pharmacy",
    description: "Medicines, wellness, and health essentials.",
    addressSuffix: "Wellness Street, Block A",
    phone: "9876501003",
    rating: 4.7,
    totalReviews: 312,
  },
  {
    name: "BrewBean Cafe",
    category: "cafe",
    description: "Coffee, snacks, and quick bites.",
    addressSuffix: "Clubhouse Corner",
    phone: "9876501004",
    rating: 4.5,
    totalReviews: 154,
  },
];

const HOME_PRODUCT_SEEDS: Record<
  string,
  Array<{ name: string; category: string; price: number; originalPrice?: number; stock: number; rating: number; totalReviews: number }>
> = {
  grocery: [
    { name: "A2 Cow Milk 1L", category: "Dairy", price: 72, originalPrice: 82, stock: 120, rating: 4.5, totalReviews: 92 },
    { name: "Farm Eggs 12 pcs", category: "Dairy", price: 96, originalPrice: 110, stock: 80, rating: 4.6, totalReviews: 74 },
    { name: "Organic Atta 5kg", category: "Staples", price: 269, originalPrice: 299, stock: 40, rating: 4.7, totalReviews: 65 },
    { name: "Seasonal Fruit Box", category: "Fruits", price: 349, originalPrice: 399, stock: 35, rating: 4.4, totalReviews: 51 },
  ],
  restaurant: [
    { name: "Paneer Butter Masala", category: "Main Course", price: 229, originalPrice: 259, stock: 60, rating: 4.4, totalReviews: 119 },
    { name: "Veg Biryani Family Pack", category: "Main Course", price: 299, originalPrice: 349, stock: 45, rating: 4.5, totalReviews: 141 },
    { name: "Tandoori Roti (6)", category: "Breads", price: 79, originalPrice: 99, stock: 90, rating: 4.3, totalReviews: 88 },
    { name: "Gulab Jamun", category: "Desserts", price: 99, originalPrice: 129, stock: 55, rating: 4.6, totalReviews: 97 },
  ],
  pharmacy: [
    { name: "Vitamin C Tablets", category: "Supplements", price: 189, originalPrice: 229, stock: 70, rating: 4.6, totalReviews: 77 },
    { name: "Digital Thermometer", category: "Devices", price: 249, originalPrice: 299, stock: 32, rating: 4.5, totalReviews: 43 },
    { name: "Pain Relief Spray", category: "First Aid", price: 139, originalPrice: 159, stock: 66, rating: 4.4, totalReviews: 38 },
    { name: "Hand Sanitizer 500ml", category: "Hygiene", price: 99, originalPrice: 129, stock: 88, rating: 4.3, totalReviews: 52 },
  ],
  cafe: [
    { name: "Cold Coffee", category: "Beverages", price: 129, originalPrice: 149, stock: 100, rating: 4.5, totalReviews: 80 },
    { name: "Cappuccino", category: "Beverages", price: 119, originalPrice: 139, stock: 100, rating: 4.6, totalReviews: 97 },
    { name: "Veg Sandwich", category: "Snacks", price: 149, originalPrice: 179, stock: 72, rating: 4.4, totalReviews: 63 },
    { name: "Blueberry Muffin", category: "Bakery", price: 89, originalPrice: 109, stock: 54, rating: 4.2, totalReviews: 44 },
  ],
};

export async function ensureSocietyDemoCatalog(societyId: string): Promise<void> {
  const existing = await prisma.business.findFirst({ where: { societyId, status: "active" } });
  if (existing) return;

  const society = await prisma.society.findUnique({ where: { id: societyId } });
  const societyName = society?.name || "Your Society";

  // Demo businesses need a synthetic owner user (unique ownerId FK constraint).
  const businessRefs: Array<{ id: string; category: string }> = [];

  for (let index = 0; index < HOME_BUSINESS_SEEDS.length; index++) {
    const seed = HOME_BUSINESS_SEEDS[index];
    const demoOwner = await prisma.user.create({
      data: {
        firstName: seed.name,
        lastName: "Demo Owner",
        email: `demo-owner-${societyId}-${index + 1}@mohallamitr.in`,
        phone: seed.phone,
        passwordHash: "demo-account-no-login",
        role: "businessOwner",
        societyId,
        status: "inactive", // demo accounts cannot log in
      },
    });

    const business = await prisma.business.create({
      data: {
        name: seed.name,
        category: seed.category,
        description: seed.description,
        ownerId: demoOwner.id,
        societyId,
        address: `${societyName}, ${seed.addressSuffix}`,
        phone: seed.phone,
        email: `hello+${seed.name.toLowerCase().replace(/\s+/g, "")}@mohallamitr.in`,
        rating: seed.rating,
        totalReviews: seed.totalReviews,
        isVerified: true,
        status: "active",
        isDemo: true,
      },
    });

    businessRefs.push({ id: business.id, category: seed.category });
  }

  for (const ref of businessRefs) {
    const seeds = HOME_PRODUCT_SEEDS[ref.category] ?? [];
    for (const seed of seeds) {
      const discount = seed.originalPrice
        ? Math.round(((seed.originalPrice - seed.price) / seed.originalPrice) * 100)
        : 0;

      await prisma.product.create({
        data: {
          businessId: ref.id,
          name: seed.name,
          description: `${seed.name} from trusted local stores`,
          category: seed.category,
          price: seed.price,
          originalPrice: seed.originalPrice ?? null,
          discount,
          stock: seed.stock,
          rating: seed.rating,
          totalReviews: seed.totalReviews,
          status: "active",
          isVerified: true,
          approvalStatus: "approved",
          availableToday: true,
          isDemo: true,
        },
      });
    }
  }
}

export async function getSocietyProducts(businessIds: string[]): Promise<any[]> {
  if (businessIds.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { businessId: { in: businessIds }, status: "active" },
  });
  return products.filter((p) => p.isVerified === true || p.approvalStatus === "approved");
}
