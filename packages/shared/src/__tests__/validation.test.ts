import {
  authCredentialsSchema,
  registerSchema,
  societySchema,
  businessSchema,
  productSchema,
  addressSchema,
  createOrderSchema,
  reviewSchema,
  paginationSchema,
  searchQuerySchema,
  updateOrderStatusSchema,
  updateProfileSchema,
} from '../validation';

describe('authCredentialsSchema', () => {
  it('validates correct credentials', () => {
    const result = authCredentialsSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = authCredentialsSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = authCredentialsSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password exceeding max length', () => {
    const result = authCredentialsSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it('accepts password at boundary lengths', () => {
    const minResult = authCredentialsSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(8),
    });
    expect(minResult.success).toBe(true);

    const maxResult = authCredentialsSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(128),
    });
    expect(maxResult.success).toBe(true);
  });
});

describe('registerSchema', () => {
  const validData = {
    email: 'user@example.com',
    password: 'password123',
    firstName: 'Rajat',
    lastName: 'Verma',
    phone: '9876543210',
  };

  it('validates correct registration data', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects missing firstName', () => {
    const result = registerSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing lastName', () => {
    const result = registerSchema.safeParse({ ...validData, lastName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone number', () => {
    const result = registerSchema.safeParse({ ...validData, phone: '1234567890' });
    expect(result.success).toBe(false);
  });

  it('accepts valid Indian phone numbers starting with 6-9', () => {
    for (const prefix of ['6', '7', '8', '9']) {
      const result = registerSchema.safeParse({
        ...validData,
        phone: `${prefix}123456789`,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('societySchema', () => {
  const validSociety = {
    name: 'Green Park Society',
    address: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  };

  it('validates correct society data', () => {
    const result = societySchema.safeParse(validSociety);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = societySchema.safeParse({
      ...validSociety,
      description: 'A lovely society',
      imageUrl: 'https://example.com/image.png',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = societySchema.safeParse({ ...validSociety, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid pincode', () => {
    const result = societySchema.safeParse({ ...validSociety, pincode: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects pincode starting with 0', () => {
    const result = societySchema.safeParse({ ...validSociety, pincode: '012345' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid imageUrl', () => {
    const result = societySchema.safeParse({ ...validSociety, imageUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

describe('businessSchema', () => {
  const validBusiness = {
    name: 'Fresh Mart',
    category: 'groceries',
    phone: '9876543210',
    address: '456 Shop Street',
  };

  it('validates correct business data', () => {
    const result = businessSchema.safeParse(validBusiness);
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = businessSchema.safeParse({
      ...validBusiness,
      description: 'Best grocery store',
      email: 'shop@example.com',
      imageUrl: 'https://example.com/img.jpg',
      bannerUrl: 'https://example.com/banner.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name exceeding max length', () => {
    const result = businessSchema.safeParse({
      ...validBusiness,
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const result = businessSchema.safeParse({ ...validBusiness, phone: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = businessSchema.safeParse({ ...validBusiness, category: '' });
    expect(result.success).toBe(false);
  });
});

describe('productSchema', () => {
  const validProduct = {
    name: 'Organic Milk',
    category: 'dairy',
    price: 60,
    stock: 100,
    imageUrls: ['https://example.com/milk.jpg'],
  };

  it('validates correct product data', () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      description: 'Fresh organic milk',
      originalPrice: 80,
      discount: 25,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    const result = productSchema.safeParse({ ...validProduct, price: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects zero price', () => {
    const result = productSchema.safeParse({ ...validProduct, price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock', () => {
    const result = productSchema.safeParse({ ...validProduct, stock: -1 });
    expect(result.success).toBe(false);
  });

  it('allows zero stock', () => {
    const result = productSchema.safeParse({ ...validProduct, stock: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects too many images', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      imageUrls: Array(6).fill('https://example.com/img.jpg'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects discount over 100', () => {
    const result = productSchema.safeParse({ ...validProduct, discount: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding max length', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      name: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe('addressSchema', () => {
  const validAddress = {
    type: 'home' as const,
    street: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '9876543210',
  };

  it('validates correct address', () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('accepts all address types', () => {
    for (const type of ['home', 'work', 'other'] as const) {
      const result = addressSchema.safeParse({ ...validAddress, type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid address type', () => {
    const result = addressSchema.safeParse({ ...validAddress, type: 'office' });
    expect(result.success).toBe(false);
  });

  it('defaults isDefault to false', () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(false);
    }
  });

  it('rejects invalid pincode', () => {
    const result = addressSchema.safeParse({ ...validAddress, pincode: 'ABCDEF' });
    expect(result.success).toBe(false);
  });
});

describe('createOrderSchema', () => {
  const validOrder = {
    businessId: 'business-123',
    items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
    deliveryAddress: {
      type: 'home' as const,
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9876543210',
    },
    paymentMethod: 'cash' as const,
  };

  it('validates correct order data', () => {
    const result = createOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing businessId', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, businessId: '' });
    expect(result.success).toBe(false);
  });

  it('accepts all payment methods', () => {
    for (const method of ['cash', 'card', 'upi', 'wallet'] as const) {
      const result = createOrderSchema.safeParse({ ...validOrder, paymentMethod: method });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid payment method', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, paymentMethod: 'bitcoin' });
    expect(result.success).toBe(false);
  });

  it('accepts optional notes', () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      notes: 'Please deliver after 5 PM',
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes exceeding max length', () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      notes: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('reviewSchema', () => {
  const validReview = {
    rating: 4,
    comment: 'Great product! Would buy again.',
  };

  it('validates correct review', () => {
    const result = reviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('accepts rating boundary values', () => {
    expect(reviewSchema.safeParse({ ...validReview, rating: 1 }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...validReview, rating: 5 }).success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = reviewSchema.safeParse({ ...validReview, rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = reviewSchema.safeParse({ ...validReview, rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects comment shorter than 10 chars', () => {
    const result = reviewSchema.safeParse({ ...validReview, comment: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects comment exceeding max length', () => {
    const result = reviewSchema.safeParse({
      ...validReview,
      comment: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects too many images', () => {
    const result = reviewSchema.safeParse({
      ...validReview,
      imageUrls: Array(4).fill('https://example.com/img.jpg'),
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('provides defaults', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('validates custom pagination', () => {
    const result = paginationSchema.safeParse({ page: 3, limit: 50 });
    expect(result.success).toBe(true);
  });

  it('rejects page < 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const result = paginationSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts optional sort fields', () => {
    const result = paginationSchema.safeParse({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid sortOrder', () => {
    const result = paginationSchema.safeParse({ sortOrder: 'random' });
    expect(result.success).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('validates correct search query', () => {
    const result = searchQuerySchema.safeParse({ query: 'fresh milk' });
    expect(result.success).toBe(true);
  });

  it('rejects empty query', () => {
    const result = searchQuerySchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });

  it('rejects query exceeding max length', () => {
    const result = searchQuerySchema.safeParse({ query: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts optional filters', () => {
    const result = searchQuerySchema.safeParse({
      query: 'milk',
      category: 'dairy',
      minPrice: 10,
      maxPrice: 100,
      societyId: 'society-123',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateOrderStatusSchema', () => {
  it('validates all valid statuses', () => {
    const validStatuses = [
      'pending', 'confirmed', 'preparing', 'ready',
      'outForDelivery', 'delivered', 'cancelled',
    ];
    for (const status of validStatuses) {
      const result = updateOrderStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'shipped' });
    expect(result.success).toBe(false);
  });

  it('accepts optional notes', () => {
    const result = updateOrderStatusSchema.safeParse({
      status: 'confirmed',
      notes: 'Order is being prepared',
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes exceeding 500 chars', () => {
    const result = updateOrderStatusSchema.safeParse({
      status: 'confirmed',
      notes: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('validates partial updates', () => {
    const result = updateProfileSchema.safeParse({ firstName: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('validates all fields together', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      profileImageUrl: 'https://example.com/profile.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid phone', () => {
    const result = updateProfileSchema.safeParse({ phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects firstName exceeding max length', () => {
    const result = updateProfileSchema.safeParse({ firstName: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid profileImageUrl', () => {
    const result = updateProfileSchema.safeParse({ profileImageUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});
