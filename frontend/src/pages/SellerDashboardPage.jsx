import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2,
  TrendingUp,
  DollarSign,
  Star,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
  Search,
  Filter,
  X as XIcon,
  SlidersHorizontal,
  Truck,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { formatCurrency, formatDate } from '../utils/formatters';
import useAuthStore from '../store/useAuthStore';
import { useCache } from '../hooks/useCache';
import { uploadImageViaServiceWorker } from '../utils/uploadService';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';
import { useFilter } from '../hooks/useFilter';

const SellerDashboardPage = () => {
  // Load active tab from localStorage or default to 0
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('sellerDashboardTab');
    return savedTab ? parseInt(savedTab, 10) : 0;
  });
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    category: 'all',
    minPrice: undefined,
    maxPrice: undefined,
    inStock: undefined,
    sortBy: undefined,
    sortOrder: 'asc',
  });
  const user = useAuthStore((state) => state.user);
  const { getCached } = useCache();
  
  // Check if user is admin verified
  const isVerified = user?.is_admin_verified === true;
  
  // Search and filter hooks
  const productsArray = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const { searchQuery, setSearchQuery, searchResults } = useOptimizedSearch(productsArray);
  const filteredProducts = useFilter(Array.isArray(searchResults) ? searchResults : [], filterCriteria);
  
  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  useEffect(() => {
    // Don't fetch data until user is loaded
    if (!user || !user.id) {
      return;
    }

    if (activeTab === 0) {
      fetchStats();
    } else if (activeTab === 1) {
      fetchOrders();
    } else if (activeTab === 2) {
      fetchProducts();
    } else if (activeTab === 3) {
      fetchReviews();
    }
    // Tab 4 (Market) doesn't need to fetch anything - it's a link to marketplace
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]); // Re-run when user.id changes (user loads)

  // Separate effect to ensure products are fetched when user loads (even if not on products tab)
  // This ensures stats have product data to calculate from
  useEffect(() => {
    if (!user || !user.id) {
      return;
    }
    
    // Small delay to ensure auth is fully initialized, then fetch products
    const timer = setTimeout(() => {
      fetchProducts();
      // After products are fetched, recalculate stats
      setTimeout(() => {
        fetchStats();
      }, 100);
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Run when user loads

  const fetchStats = async () => {
    // Don't fetch if user is not loaded
    if (!user || !user.id) {
      return;
    }

    // Use products state if available, otherwise fetch
    let productsToUse = products;
    
    // If we don't have products in state yet, fetch them
    if (!productsToUse || productsToUse.length === 0) {
      try {
        const productsResponse = await getCached('/api/v1/products/seller/', {}, { cacheTTL: 5 * 60 * 1000 });
        
        let fetchedProducts = [];
        if (productsResponse?.data?.results && Array.isArray(productsResponse.data.results)) {
          fetchedProducts = productsResponse.data.results;
        } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
          fetchedProducts = productsResponse.data;
        } else if (Array.isArray(productsResponse)) {
          fetchedProducts = productsResponse;
        }
        
        // SECURITY: Filter to only current seller's products
        productsToUse = fetchedProducts.filter(
          p => p.seller_id === user.id || p.farmer_id === user.id
        );
      } catch (error) {
        console.error('Error fetching products for stats:', error);
        productsToUse = [];
      }
    }
    
    // Calculate stats from products
    const totalProducts = productsToUse.length;
    const activeProducts = productsToUse.filter(p => p.is_active !== false).length;
    
    // Calculate average rating from products
    const productsWithRatings = productsToUse.filter(p => p.rating);
    const averageRating = productsWithRatings.length > 0
      ? productsWithRatings.reduce((sum, p) => sum + (p.rating || 0), 0) / productsWithRatings.length
      : 0;
    const totalReviews = productsToUse.reduce((sum, p) => sum + (p.reviews || 0), 0);
    
    setStats({
      total_products: totalProducts,
      active_products: activeProducts,
      total_orders: orders.length, // Use orders from state
      total_revenue: 0, // Will be calculated when orders endpoint is ready with prices
      pending_orders: orders.filter(o => o.status === 'pending').length,
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      total_reviews: totalReviews,
    });
  };

  const fetchOrders = async () => {
    // Don't fetch if user is not loaded
    if (!user || !user.id) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getCached('/api/v1/orders/seller/', {}, { cacheTTL: 2 * 60 * 1000 });
      
      // Handle APIResponse format: {status, message, data: {results: [...]}}
      let orders = [];
      if (response?.data?.results && Array.isArray(response.data.results)) {
        orders = response.data.results;
      } else if (response?.results && Array.isArray(response.results)) {
        orders = response.results;
      } else if (Array.isArray(response?.data)) {
        orders = response.data;
      } else if (Array.isArray(response)) {
        orders = response;
      }
      
      // Sort orders: Non-delivered orders first (by date, newest first), then delivered orders (by date, newest first)
      const sortedOrders = [...orders].sort((a, b) => {
        const nonDeliveredStatuses = ['pending', 'paid', 'processing', 'shipped'];
        const deliveredStatuses = ['delivered', 'cancelled', 'refunded'];
        
        const aIsNonDelivered = nonDeliveredStatuses.includes(a.status);
        const bIsNonDelivered = nonDeliveredStatuses.includes(b.status);
        
        // First, separate non-delivered from delivered
        if (aIsNonDelivered !== bIsNonDelivered) {
          return aIsNonDelivered ? -1 : 1; // Non-delivered comes first
        }
        
        // Within same category, sort by date (newest first)
        const aDate = new Date(a.created_at || 0);
        const bDate = new Date(b.created_at || 0);
        return bDate - aDate;
      });
      
      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch orders';
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    // Don't fetch if user is not loaded
    if (!user || !user.id) {
      console.log('User not loaded, skipping product fetch');
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getCached('/api/v1/products/seller/', {}, { cacheTTL: 5 * 60 * 1000 });
      
      // Handle API response format
      let products = [];
      if (response?.data?.results && Array.isArray(response.data.results)) {
        products = response.data.results;
      } else if (response?.data && Array.isArray(response.data)) {
        products = response.data;
      } else if (Array.isArray(response)) {
        products = response;
      } else if (response?.results && Array.isArray(response.results)) {
        products = response.results;
      }
      
      // SECURITY: Client-side filter to ensure only current seller's products are shown
      // This is an additional security layer in case backend filtering fails
      products = products.filter(
        p => p.seller_id === user.id || p.farmer_id === user.id
      );
      
      // Sort products: active first, then by date (newest first)
      const sortedProducts = [...products].sort((a, b) => {
        // First sort by active status (active first)
        if (a.is_active !== b.is_active) {
          return b.is_active ? 1 : -1; // true comes before false
        }
        
        // Then sort by date (newest first)
        const aDate = new Date(a.created_at || 0);
        const bDate = new Date(b.created_at || 0);
        return bDate - aDate;
      });
      
      setProducts(sortedProducts);
      
      // Always update stats when products are fetched (use setTimeout to avoid dependency issues)
      setTimeout(() => {
        fetchStats();
      }, 50);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch products';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    // Don't fetch if user is not loaded
    if (!user || !user.id) {
      setReviews([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getCached('/api/v1/reviews/seller/', {}, { cacheTTL: 5 * 60 * 1000 });
      
      // Handle API response format
      let reviews = [];
      if (response?.data?.results && Array.isArray(response.data.results)) {
        reviews = response.data.results;
      } else if (response?.data && Array.isArray(response.data)) {
        reviews = response.data;
      } else if (Array.isArray(response)) {
        reviews = response;
      } else if (response?.results && Array.isArray(response.results)) {
        reviews = response.results;
      }
      
      setReviews(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch reviews';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      const response = await api.patch(`/api/v1/orders/${orderId}/confirm/`);
      toast.success(response.data?.message || 'Order confirmed successfully!');
      fetchOrders();
      if (activeTab === 0) {
        fetchStats();
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handleShip = async (orderId) => {
    try {
      const response = await api.patch(`/api/v1/orders/${orderId}/ship/`);
      toast.success(response.data?.message || 'Order shipped successfully!');
      fetchOrders();
      if (activeTab === 0) {
        fetchStats();
      }
    } catch (error) {
      console.error('Error shipping order:', error);
      toast.error(error.response?.data?.message || 'Failed to ship order');
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await api.patch(`/api/v1/orders/${orderId}/`, {
        status: 'cancelled'
      });
      
      toast.success('Order cancelled successfully');
      fetchOrders();
      
      // Refresh stats after cancellation
      if (activeTab === 0) {
        fetchStats();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to cancel order';
      toast.error(errorMsg);
    }
  };

  const handleDeleteProduct = async (productId) => {
    // Check admin verification
    if (!isVerified) {
      toast.error('Your account needs to be verified by an administrator before deleting products.');
      return;
    }

    // SECURITY: Verify ownership before deletion
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }
    
    // Check if product belongs to current user
    if (user && user.id && product.seller_id !== user.id && product.farmer_id !== user.id) {
      toast.error('You can only delete your own products');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/api/v1/products/${productId}/`);
      toast.success('Product deleted!');
      fetchProducts(); // This will trigger fetchStats automatically
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete product';
      toast.error(errorMsg);
    }
  };

  const handleSaveProduct = async (formData) => {
    // Check admin verification
    if (!isVerified) {
      toast.error('Your account needs to be verified by an administrator before adding or editing products.');
      setShowProductModal(false);
      setEditingProduct(null);
      return;
    }

    try {
      // SECURITY: Verify ownership if editing existing product
      if (editingProduct) {
        if (user && user.id && editingProduct.seller_id !== user.id && editingProduct.farmer_id !== user.id) {
          toast.error('You can only edit your own products');
          setShowProductModal(false);
          setEditingProduct(null);
          return;
        }
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        unit: formData.unit,
        category: formData.category,
        image: formData.image,
      };

      // Add is_active only for updates
      if (editingProduct) {
        payload.is_active = formData.is_active;
      }

      if (editingProduct) {
        // Update existing product
        await api.patch(`/api/v1/products/${editingProduct.id}/`, payload);
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        await api.post('/api/v1/products/', payload);
        toast.success('Product created successfully!');
      }

      setShowProductModal(false);
      setEditingProduct(null);
      fetchProducts(); // This will trigger fetchStats automatically
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.errors || error.message || 'Failed to save product';
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorText = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages[0] : messages}`)
          .join(', ');
        toast.error(errorText);
      } else {
        toast.error(errorMsg);
      }
      throw error; // Re-throw so modal can handle saving state
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'shipped':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text mb-2">
            Seller Dashboard
          </h1>
          <p className="text-body text-lg text-gray-600 dark:text-gray-300">
            Manage your products, orders, and reviews
          </p>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Products</p>
                  <p className="text-3xl font-bold gradient-text">{stats.total_products}</p>
                </div>
                <Package className="w-12 h-12 text-primary-500 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold gradient-text">{stats.total_orders}</p>
                </div>
                <ShoppingBag className="w-12 h-12 text-accent-500 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold gradient-text">{formatCurrency(stats.total_revenue)}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-500 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Rating</p>
                  <div className="flex items-center space-x-1">
                    <p className="text-3xl font-bold gradient-text">{stats.average_rating}</p>
                    <Star className="w-6 h-6 fill-accent-500 text-accent-500" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.total_reviews} reviews</p>
                </div>
                <Star className="w-12 h-12 text-accent-500 opacity-50" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <div className="glass rounded-2xl p-2 mb-8 flex flex-wrap gap-2">
          {[
          { id: 0, label: 'Overview', icon: BarChart3 },
          { id: 1, label: 'Orders', icon: ShoppingBag, count: orders.length },
          { id: 2, label: 'Products', icon: Package, count: products.length },
          { id: 3, label: 'Reviews', icon: Star, count: reviews.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Save tab state to localStorage
                localStorage.setItem('sellerDashboardTab', tab.id.toString());
              }}
              className={`flex-1 md:flex-none py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-farm text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 0 && stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-display font-bold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <ShoppingBag className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">Pending Orders</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{stats.pending_orders} orders awaiting action</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-accent-500" />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">Active Products</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{stats.active_products} products listed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-display font-bold mb-4">Performance</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                    <span className="font-semibold gradient-text">{formatCurrency(stats.total_revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-farm h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Customer Rating</span>
                    <span className="font-semibold gradient-text">{stats.average_rating}/5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-accent-500 h-2 rounded-full" style={{ width: `${(stats.average_rating / 5) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Orders Tab - Seller managing orders for their products */}
        {activeTab === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold mb-2">Product Orders</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage orders for your products. Ship or reject orders from buyers.
              </p>
            </div>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  // Handle orders with order_items (detail view) or list view
                  const orderItems = order.order_items || [];
                  const firstProductName = order.first_product_name || (orderItems[0]?.product_name) || 'Product';
                  const itemCount = order.item_count || orderItems.length || 1;
                  const totalAmount = order.total_amount || 0;
                  const orderNumber = order.order_number || `#${order.id}`;
                  
                  return (
                    <div
                      key={order.id}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800/50 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                              {firstProductName}
                              {itemCount > 1 && ` + ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`}
                            </h3>
                            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <ShoppingBag className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Order</p>
                                <p className="font-semibold text-gray-800 dark:text-white">{orderNumber}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                                <p className="font-semibold text-gray-800 dark:text-white">{formatDate(order.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
                                <p className="font-semibold text-gray-800 dark:text-white">{itemCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                                <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(totalAmount)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Buyer</p>
                              <p className="font-semibold text-gray-800 dark:text-white">{order.buyer_name || 'N/A'}</p>
                            </div>
                            {order.recipient_address && (
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivery Address</p>
                                <p className="font-semibold text-gray-800 dark:text-white">{order.recipient_address}</p>
                              </div>
                            )}
                          </div>
                          {order.redx_tracking_number && (
                            <div className="flex items-center space-x-2 text-sm bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
                              <Truck className="w-4 h-4 text-green-700 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tracking Number</p>
                                <p className="font-mono font-semibold text-green-700 dark:text-green-400">{order.redx_tracking_number}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-3 md:min-w-[180px]">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                          </div>
                          <div className="flex flex-col space-y-2 w-full">
                            {order.status === 'paid' && (
                                <>
                                <button
                                    onClick={() => handleConfirm(order.id)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm flex items-center justify-center space-x-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Confirm Order</span>
                                </button>
                                <button
                                    onClick={() => handleCancel(order.id)}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm flex items-center justify-center space-x-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>Cancel</span>
                                </button>
                                </>
                            )}
                            {order.status === 'confirmed' && (
                                <button
                                onClick={() => handleShip(order.id)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm flex items-center justify-center space-x-2"
                                >
                                <Truck className="w-4 h-4" />
                                <span>Ship Order</span>
                                </button>
                            )}
                            {order.status === 'shipped' && order.redx_tracking_number && (
                              <button
                                onClick={() => {
                                  // Handle track order - could open modal or navigate
                                  toast(`Tracking: ${order.redx_tracking_number}`, { icon: '📦' });
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm flex items-center justify-center space-x-2"
                              >
                                <Truck className="w-4 h-4" />
                                <span>Track</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Products Tab */}
        {activeTab === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-display font-bold">My Products</h2>
              <button
                onClick={() => {
                  if (!isVerified) {
                    toast.error('Your account needs to be verified by an administrator before adding products.');
                    return;
                  }
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                disabled={!isVerified}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="glass rounded-xl p-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Category
                        </label>
                        <select
                          value={filterCriteria.category || 'all'}
                          onChange={(e) => setFilterCriteria({ ...filterCriteria, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat === 'all' ? 'All Categories' : cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Price Range */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Min Price (৳)
                        </label>
                        <input
                          type="number"
                          value={filterCriteria.minPrice || ''}
                          onChange={(e) => setFilterCriteria({ ...filterCriteria, minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Min"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Max Price (৳)
                        </label>
                        <input
                          type="number"
                          value={filterCriteria.maxPrice || ''}
                          onChange={(e) => setFilterCriteria({ ...filterCriteria, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Max"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Stock Filter */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Stock Status
                        </label>
                        <select
                          value={filterCriteria.inStock === undefined ? 'all' : filterCriteria.inStock ? 'inStock' : 'outOfStock'}
                          onChange={(e) => {
                            const value = e.target.value === 'all' ? undefined : e.target.value === 'inStock';
                            setFilterCriteria({ ...filterCriteria, inStock: value });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="all">All</option>
                          <option value="inStock">In Stock</option>
                          <option value="outOfStock">Out of Stock</option>
                        </select>
                      </div>

                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Sort By
                        </label>
                        <select
                          value={filterCriteria.sortBy || 'name'}
                          onChange={(e) => setFilterCriteria({ ...filterCriteria, sortBy: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="name">Name</option>
                          <option value="price">Price</option>
                          <option value="stock">Stock</option>
                          <option value="rating">Rating</option>
                          <option value="created_at">Date Added</option>
                        </select>
                      </div>

                      {/* Sort Order */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Order
                        </label>
                        <select
                          value={filterCriteria.sortOrder || 'asc'}
                          onChange={(e) => setFilterCriteria({ ...filterCriteria, sortOrder: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setFilterCriteria({
                            category: 'all',
                            minPrice: undefined,
                            maxPrice: undefined,
                            inStock: undefined,
                            sortBy: undefined,
                            sortOrder: 'asc',
                          });
                        }}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {loading && products.length === 0 ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                  {products.length === 0 
                    ? 'No products yet' 
                    : 'No products match your search/filter criteria'}
                </p>
                {products.length === 0 && (
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="btn-primary"
                  >
                    Add Your First Product
                  </button>
                )}
                {products.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCriteria({
                        category: 'all',
                        minPrice: undefined,
                        maxPrice: undefined,
                        inStock: undefined,
                        sortBy: undefined,
                        sortOrder: 'asc',
                      });
                    }}
                    className="btn-primary"
                  >
                    Clear Search/Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="glass rounded-xl overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-100 to-amber-100 dark:from-green-900 dark:to-amber-900">
                      <img
                        src={product.image || 'https://via.placeholder.com/400x300?text=Product'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xl font-bold gradient-text">{formatCurrency(product.price)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Stock: {product.stock}</p>
                      </div>
                      <div className="flex space-x-2">
                        {/* SECURITY: Only show edit/delete buttons for products owned by current user */}
                        {user && user.id && (product.seller_id === user.id || product.farmer_id === user.id) ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductModal(true);
                              }}
                              className="flex-1 py-2 px-4 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors flex items-center justify-center space-x-1"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="py-2 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex-1 py-2 px-4 text-center text-xs text-gray-500 dark:text-gray-400 italic">
                            Not your product
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Reviews Tab */}
        {activeTab === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-20">
                <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="glass rounded-xl p-6 border border-white/20 dark:border-gray-700/20"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={review.buyer_avatar}
                        alt={review.buyer_name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800 dark:text-white">{review.buyer_name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{review.product_name}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-accent-500 text-accent-500'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">{review.comment}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    stock: product?.stock || '',
    unit: product?.unit || 'kg',
    category: product?.category || 'Vegetables',
    image: product?.image || '',
    is_active: product?.is_active !== undefined ? product.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.image || null);
  const [uploadingImageUrl, setUploadingImageUrl] = useState(null);
  const productImageInputRef = useRef(null);

  // Update image preview when product changes (for editing)
  useEffect(() => {
    setImagePreview(product?.image || null);
    setFormData(prev => ({
      ...prev,
      image: product?.image || '',
    }));
  }, [product?.image]);

  // Listen for upload completion messages from Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = async (event) => {
      if (event.data.type === 'UPLOAD_COMPLETE') {
        const { uploadId, imageUrl, error, success } = event.data;
        
        if (success && imageUrl) {
          // Upload completed, update form data
          console.log('Product image upload completed via Service Worker:', imageUrl);
          
          // Update preview if we have the image URL
          setImagePreview(imageUrl);
          setUploadingImageUrl(imageUrl);
          setFormData(prev => ({ ...prev, image: imageUrl }));
          setUploadingImage(false);
          
          toast.success('Image uploaded successfully!', { duration: 2000 });
        } else {
          console.error('Product image upload failed via Service Worker:', error);
          toast.error(error || 'Upload failed');
          setUploadingImage(false);
          setImagePreview(product?.image || null);
          setUploadingImageUrl(null);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [product?.image]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-modern"
              placeholder="e.g., Fresh Organic Tomatoes"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-modern"
              rows={4}
              placeholder="Describe your product..."
              required
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Price (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input-modern"
                placeholder="80.00"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Stock *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="input-modern"
                placeholder="150"
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-modern"
                required
                disabled={saving}
              >
                <option value="kg">kg</option>
                <option value="piece">piece</option>
                <option value="dozen">dozen</option>
                <option value="bag">bag</option>
                <option value="bundle">bundle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-modern"
                required
                disabled={saving}
              >
              <option value="Vegetables">Vegetables</option>
              <option value="Fruits">Fruits</option>
              <option value="Grains">Grains</option>
              <option value="Spices">Spices</option>
              <option value="Livestock">Livestock</option>
              <option value="Dairy">Dairy</option>
              <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
              Product Image *
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!uploadingImage && imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image: '' });
                        setUploadingImageUrl(null);
                        if (productImageInputRef.current) {
                          productImageInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      disabled={saving}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Upload Button */}
              {!imagePreview && (
                <label
                  htmlFor="product-image-input"
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploadingImage || saving
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-10 h-10 text-gray-400 animate-spin mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, WEBP (MAX. 10MB)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={productImageInputRef}
                    id="product-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage || saving}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file size (10MB max)
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('Image size must be less than 10MB');
                        if (productImageInputRef.current) {
                          productImageInputRef.current.value = '';
                        }
                        return;
                      }

                      // Show preview immediately with local file
                      const localPreview = URL.createObjectURL(file);
                      setImagePreview(localPreview);
                      setUploadingImage(true);

                      // Start background upload via Service Worker
                      uploadImageViaServiceWorker(file, 'agroconnect', { 
                        productId: product?.id,
                        productName: formData.name || 'product'
                      })
                        .then((imageUrl) => {
                          // Clean up local preview URL
                          URL.revokeObjectURL(localPreview);
                          
                          // Update preview with actual Cloudinary URL
                          setImagePreview(imageUrl);
                          setUploadingImageUrl(imageUrl);
                          setFormData({ ...formData, image: imageUrl });
                          setUploadingImage(false);
                          
                          toast.success('Image uploaded successfully!', { duration: 2000 });
                        })
                        .catch((error) => {
                          console.error('Image upload error:', error);
                          // Clean up local preview URL on error
                          URL.revokeObjectURL(localPreview);
                          toast.error(error.message || 'Failed to upload image');
                          setUploadingImage(false);
                          setImagePreview(product?.image || null); // Revert to original
                          setUploadingImageUrl(null);
                          if (productImageInputRef.current) {
                            productImageInputRef.current.value = '';
                          }
                        });
                    }}
                  />
                </label>
              )}

              {/* Replace Image Button (when image exists) */}
              {imagePreview && !uploadingImage && (
                <label
                  htmlFor="product-image-replace-input"
                  className="flex items-center justify-center w-full py-2 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Replace Image
                  <input
                    id="product-image-replace-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage || saving}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file size (10MB max)
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('Image size must be less than 10MB');
                        return;
                      }

                      // Show preview immediately with local file
                      const localPreview = URL.createObjectURL(file);
                      setImagePreview(localPreview);
                      setUploadingImage(true);

                      // Start background upload via Service Worker
                      uploadImageViaServiceWorker(file, 'agroconnect', { 
                        productId: product?.id,
                        productName: formData.name || 'product'
                      })
                        .then((imageUrl) => {
                          // Clean up local preview URL
                          URL.revokeObjectURL(localPreview);
                          
                          // Update preview with actual Cloudinary URL
                          setImagePreview(imageUrl);
                          setUploadingImageUrl(imageUrl);
                          setFormData({ ...formData, image: imageUrl });
                          setUploadingImage(false);
                          
                          toast.success('Image uploaded successfully!', { duration: 2000 });
                        })
                        .catch((error) => {
                          console.error('Image upload error:', error);
                          // Clean up local preview URL on error
                          URL.revokeObjectURL(localPreview);
                          toast.error(error.message || 'Failed to upload image');
                          setUploadingImage(false);
                          setImagePreview(formData.image || product?.image || null); // Revert to previous
                          setUploadingImageUrl(null);
                        });
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {product && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={saving}
              />
              <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Product is active (visible in marketplace)
              </label>
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage || !formData.image}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {uploadingImage 
                  ? 'Uploading image...' 
                  : saving 
                  ? 'Saving...' 
                  : product 
                  ? 'Update Product' 
                  : 'Add Product'}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SellerDashboardPage;

