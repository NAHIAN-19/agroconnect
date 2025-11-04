// Demo data for all purposes when backend is not available

export const demoProducts = [
  {
    id: 1,
    name: 'Fresh Organic Tomatoes',
    description: 'Premium organic tomatoes harvested fresh from local farms. Perfect for salads, cooking, and fresh consumption.',
    price: 80,
    stock: 150,
    unit: 'kg',
    category: 'Vegetables',
    farmer_name: 'Green Valley Farm',
    seller_id: 1,
    farmer_id: 1,
    image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&h=600&fit=crop',
    verified: true,
    rating: 4.8,
    reviews: 45,
  },
  {
    id: 2,
    name: 'Farm Fresh Potatoes',
    description: 'High quality potatoes, perfect for everyday cooking and various dishes.',
    price: 45,
    stock: 200,
    unit: 'kg',
    category: 'Vegetables',
    farmer_name: 'Sunrise Agriculture',
    seller_id: 2,
    farmer_id: 2,
    image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=800&h=600&fit=crop',
    verified: true,
    rating: 4.6,
    reviews: 32,
  },
  {
    id: 3,
    name: 'Organic Green Beans',
    description: 'Fresh, crisp green beans picked at peak freshness. Rich in nutrients.',
    price: 120,
    stock: 80,
    unit: 'kg',
    category: 'Vegetables',
    farmer_name: 'Nature\'s Best Farm',
    seller_id: 3,
    farmer_id: 3,
    image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=800&h=600&fit=crop',
    verified: true,
    rating: 4.9,
    reviews: 67,
  },
  {
    id: 4,
    name: 'Fresh Mangoes',
    description: 'Sweet, juicy mangoes from local orchards. Seasonal and delicious.',
    price: 150,
    stock: 50,
    unit: 'kg',
    category: 'Fruits',
    farmer_name: 'Tropical Farm',
    seller_id: 4,
    farmer_id: 4,
    image: 'https://images.unsplash.com/photo-1605027990121-3fdb7a2e5b0f?w=800&h=600&fit=crop',
    verified: true,
    rating: 4.7,
    reviews: 89,
  },
  {
    id: 5,
    name: 'Organic Red Onions',
    description: 'Fresh red onions with strong flavor, perfect for cooking.',
    price: 65,
    stock: 180,
    unit: 'kg',
    category: 'Vegetables',
    farmer_name: 'Green Valley Farm',
    seller_id: 1,
    farmer_id: 1,
    image: 'https://images.unsplash.com/photo-1618512496242-a07f41e9c88e?w=800&h=600&fit=crop',
    verified: true,
    rating: 4.5,
    reviews: 28,
  },
  {
    id: 6,
    name: 'Fresh Cauliflower',
    description: 'Premium quality cauliflower, white and fresh.',
    price: 90,
    stock: 60,
    unit: 'kg',
    category: 'Vegetables',
    farmer_name: 'Sunrise Agriculture',
    seller_id: 2,
    farmer_id: 2,
    image: 'https://images.unsplash.com/photo-1584270354949-b26bddf3342c?w=800&h=600&fit=crop',
    verified: true,
    rating: 4.6,
    reviews: 41,
  },
];

export const demoOrders = [
  {
    id: 1,
    buyer_name: 'Fresh Market Co.',
    product_name: 'Fresh Organic Tomatoes',
    quantity: 10,
    unit: 'kg',
    total_price: 800,
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
    order_number: 'ORD-001',
    delivery_address: '456 Main Street, Dhaka',
  },
  {
    id: 2,
    buyer_name: 'City Grocery',
    product_name: 'Farm Fresh Potatoes',
    quantity: 25,
    unit: 'kg',
    total_price: 1125,
    status: 'shipped',
    created_at: '2024-01-14T14:30:00Z',
    order_number: 'ORD-002',
    delivery_address: '789 Commercial Road, Chittagong',
  },
];

export const demoFarmerProducts = [
  {
    id: 1,
    name: 'Fresh Organic Tomatoes',
    description: 'Premium organic tomatoes',
    price: 80,
    stock: 150,
    unit: 'kg',
    category: 'Vegetables',
    image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&h=600&fit=crop',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    name: 'Farm Fresh Potatoes',
    description: 'High quality potatoes',
    price: 45,
    stock: 200,
    unit: 'kg',
    category: 'Vegetables',
    image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=800&h=600&fit=crop',
    created_at: '2024-01-08T10:00:00Z',
  },
];

export const formatCurrency = (amount) => {
  return `৳${amount.toLocaleString('en-BD')}`;
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Demo buyer dashboard data
export const demoBuyerOrders = [
  {
    id: 1,
    order_number: 'ORD-001',
    product_name: 'Fresh Organic Tomatoes',
    quantity: 10,
    unit: 'kg',
    total_price: 800,
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
    seller_name: 'Green Valley Farm',
    delivery_address: '456 Main Street, Dhaka',
  },
  {
    id: 2,
    order_number: 'ORD-002',
    product_name: 'Farm Fresh Potatoes',
    quantity: 25,
    unit: 'kg',
    total_price: 1125,
    status: 'shipped',
    created_at: '2024-01-14T14:30:00Z',
    seller_name: 'Sunrise Agriculture',
    delivery_address: '456 Main Street, Dhaka',
  },
  {
    id: 3,
    order_number: 'ORD-003',
    product_name: 'Fresh Mangoes',
    quantity: 5,
    unit: 'kg',
    total_price: 750,
    status: 'delivered',
    created_at: '2024-01-12T09:15:00Z',
    seller_name: 'Tropical Farm',
    delivery_address: '456 Main Street, Dhaka',
  },
];


export const demoSavedAddresses = [
  {
    id: 1,
    label: 'Home',
    address: '456 Main Street, Dhaka',
    is_default: true,
  },
  {
    id: 2,
    label: 'Office',
    address: '789 Business Avenue, Gulshan-2, Dhaka',
    is_default: false,
  },
];

// Demo seller stats
export const demoSellerStats = {
  total_products: 12,
  total_orders: 45,
  total_revenue: 85000,
  pending_orders: 3,
  active_products: 10,
  average_rating: 4.7,
  total_reviews: 128,
};

// Demo seller reviews
export const demoSellerReviews = [
  {
    id: 1,
    buyer_name: 'Fresh Market Co.',
    buyer_avatar: 'https://ui-avatars.com/api/?name=Fresh+Market&background=10B981&color=FFFFFF',
    rating: 5,
    comment: 'Excellent quality tomatoes! Very fresh and delivered on time.',
    product_name: 'Fresh Organic Tomatoes',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    buyer_name: 'City Grocery',
    buyer_avatar: 'https://ui-avatars.com/api/?name=City+Grocery&background=F59E0B&color=FFFFFF',
    rating: 4,
    comment: 'Good quality potatoes. Would order again.',
    product_name: 'Farm Fresh Potatoes',
    created_at: '2024-01-08T10:00:00Z',
  },
];

