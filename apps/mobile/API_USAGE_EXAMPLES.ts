/**
 * Example usage of the API client in mobile app
 * 
 * The API client is already configured to use the production API:
 * https://us-central1-our-block-app.cloudfunctions.net/api
 */

import { apiClient } from '@/services/apiClient';

// ==========================================
// AUTHENTICATION EXAMPLES
// ==========================================

/**
 * Register a new user
 */
async function registerUser() {
  try {
    const response = await apiClient.post('/auth/register', {
      email: 'user@example.com',
      password: 'Password123!',
      displayName: 'John Doe',
      phoneNumber: '+1234567890',
      role: 'customer', // or 'business_owner' or 'super_admin'
    });

    if (response.success) {
      console.log('User registered:', response.data);
      // Store auth token, navigate to home, etc.
    } else {
      console.error('Registration failed:', response.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Login user (after Firebase Auth)
 */
async function loginUser(uid: string) {
  try {
    const response = await apiClient.post('/auth/login', { uid });

    if (response.success) {
      console.log('Login successful:', response.data);
      // Navigate to appropriate dashboard based on role
    } else {
      console.error('Login failed:', response.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Get current user info
 */
async function getCurrentUser(token: string) {
  try {
    const response = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.success) {
      console.log('Current user:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================================
// SOCIETY EXAMPLES
// ==========================================

/**
 * Get all societies
 */
async function getSocieties() {
  try {
    const response = await apiClient.get('/societies');

    if (response.success) {
      console.log('Societies:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Create a new society (Super Admin only)
 */
async function createSociety() {
  try {
    const response = await apiClient.post('/societies', {
      name: 'Green Valley Society',
      address: {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
      },
      contactPerson: {
        name: 'Admin Name',
        phone: '+91-9876543210',
        email: 'admin@greenvalley.com',
      },
    });

    if (response.success) {
      console.log('Society created:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================================
// BUSINESS EXAMPLES
// ==========================================

/**
 * Get all businesses (optionally filter by society)
 */
async function getBusinesses(societyId?: string) {
  try {
    const endpoint = societyId
      ? `/businesses?societyId=${societyId}`
      : '/businesses';

    const response = await apiClient.get(endpoint);

    if (response.success) {
      console.log('Businesses:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Create a new business
 */
async function createBusiness() {
  try {
    const response = await apiClient.post('/businesses', {
      name: 'Fresh Mart',
      description: 'Local grocery store',
      category: 'grocery',
      societyId: 'society123',
      ownerId: 'user123',
      contactInfo: {
        phone: '+91-9876543210',
        email: 'freshmart@example.com',
      },
      address: {
        street: 'Shop 5, Block A',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
      },
    });

    if (response.success) {
      console.log('Business created:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================================
// PRODUCT EXAMPLES
// ==========================================

/**
 * Get products for a business
 */
async function getProducts(businessId: string) {
  try {
    const response = await apiClient.get(`/products?businessId=${businessId}`);

    if (response.success) {
      console.log('Products:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Create a new product
 */
async function createProduct(businessId: string) {
  try {
    const response = await apiClient.post('/products', {
      name: 'Fresh Apples',
      description: 'Organic apples from local farms',
      category: 'fruits',
      price: 150,
      unit: 'kg',
      businessId,
      images: ['https://example.com/apple.jpg'],
      stock: 100,
    });

    if (response.success) {
      console.log('Product created:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Update product stock
 */
async function updateProductStock(productId: string, newStock: number) {
  try {
    const response = await apiClient.put(`/products/${productId}`, {
      stock: newStock,
    });

    if (response.success) {
      console.log('Product updated:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================================
// ORDER EXAMPLES
// ==========================================

/**
 * Create a new order
 */
async function createOrder() {
  try {
    const response = await apiClient.post('/orders', {
      userId: 'user123',
      businessId: 'business123',
      items: [
        {
          productId: 'product123',
          quantity: 2,
          price: 150,
          subtotal: 300,
        },
      ],
      totalAmount: 300,
      deliveryAddress: {
        street: 'Flat 101, Building A',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
      },
    });

    if (response.success) {
      console.log('Order created:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Get user's orders
 */
async function getUserOrders(userId: string) {
  try {
    const response = await apiClient.get(`/orders?userId=${userId}`);

    if (response.success) {
      console.log('User orders:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId: string, status: string) {
  try {
    const response = await apiClient.put(`/orders/${orderId}`, { status });

    if (response.success) {
      console.log('Order updated:', response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================================
// USAGE IN REACT COMPONENTS
// ==========================================

/**
 * Example React Native component using the API
 */
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';

export function BusinessListScreen() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const response = await apiClient.get('/businesses');
      if (response.success) {
        setBusinesses(response.data);
      }
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <FlatList
      data={businesses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name}</Text>
          <Text>{item.description}</Text>
        </View>
      )}
    />
  );
}
