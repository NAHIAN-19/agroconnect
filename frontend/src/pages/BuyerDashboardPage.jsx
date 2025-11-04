import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Heart, 
  MapPin, 
  User, 
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Truck,
  Clock,
  XCircle,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { formatCurrency, formatDate } from '../utils/formatters';
import useAuthStore from '../store/useAuthStore';
import { useCache } from '../hooks/useCache';

const BuyerDashboardPage = () => {
  // Load active tab from localStorage or default to 0
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('buyerDashboardTab');
    return savedTab ? parseInt(savedTab, 10) : 0;
  });
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { getCached } = useCache();

  useEffect(() => {
    if (activeTab === 0) {
      fetchOrders();
    } else if (activeTab === 1) {
      fetchWishlist();
    } else if (activeTab === 2) {
      fetchAddresses();
    }
  }, [activeTab]);


  const fetchOrders = async () => {
    if (!user || !user.id) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getCached('/api/v1/orders/my/', {}, { cacheTTL: 2 * 60 * 1000 });
      
      // Handle APIResponse format: {status, message, data: {results: [...]}}
      let ordersData = [];
      if (response?.data?.results && Array.isArray(response.data.results)) {
        ordersData = response.data.results;
      } else if (response?.results && Array.isArray(response.results)) {
        ordersData = response.results;
      } else if (Array.isArray(response?.data)) {
        ordersData = response.data;
      } else if (Array.isArray(response)) {
        ordersData = response;
      }
      
      // SECURITY: Client-side filter to ensure only current user's orders are shown
      // This is a defense-in-depth measure in case backend filtering fails
      const userOrders = ordersData.filter(order => {
        const orderBuyerId = order.buyer?.id || order.buyer_id || order.buyer;
        return orderBuyerId === user.id;
      });
      
      // Sort orders: Non-delivered orders first (by date, newest first), then delivered orders (by date, newest first)
      const sortedOrders = [...userOrders].sort((a, b) => {
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

  const fetchWishlist = async () => {
    if (!user || !user.id) {
      setWishlist([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getCached('/api/v1/wishlist/', {}, { cacheTTL: 5 * 60 * 1000 });
      
      // Handle APIResponse format: {status, message, data: [...]}
      let wishlistData = [];
      if (response?.data && Array.isArray(response.data)) {
        wishlistData = response.data;
      } else if (response?.results && Array.isArray(response.results)) {
        wishlistData = response.results;
      } else if (Array.isArray(response)) {
        wishlistData = response;
      }
      
      // Extract products from wishlist items
      const products = wishlistData.map(item => item.product || item).filter(Boolean);
      setWishlist(products);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setWishlist([]);
      if (error.response?.status !== 404) {
        toast.error('Failed to load wishlist');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await api.delete('/api/v1/wishlist/remove/', {
        data: { product_id: productId }
      });
      toast.success('Removed from wishlist');
      fetchWishlist(); // Refresh wishlist
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      const errorMsg = error.response?.data?.message || 'Failed to remove from wishlist';
      toast.error(errorMsg);
    }
  };

  const fetchAddresses = async () => {
    if (!user || !user.id) {
      setAddresses([]);
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement address fetching when backend endpoint is ready
      // const response = await getCached('/api/v1/addresses/', {}, { cacheTTL: 5 * 60 * 1000});
      // setAddresses(response?.data || response || []);
      setAddresses([]);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddresses([]);
      if (error.response?.status !== 404) {
        toast.error('Failed to load addresses');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-500" />;
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

  // Calculate stats
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    totalSpent: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_price || 0), 0),
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
            Buyer Dashboard
          </h1>
          <p className="text-body text-lg text-gray-600 dark:text-gray-300">
            Manage your orders, wishlist, and addresses
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                <p className="text-3xl font-bold gradient-text">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="w-12 h-12 text-primary-500 opacity-50" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingOrders}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500 opacity-50" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delivered</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.deliveredOrders}</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500 opacity-50" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
                <p className="text-2xl font-bold gradient-text">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-accent-500 opacity-50" />
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="glass rounded-2xl p-2 mb-8 flex flex-wrap gap-2">
          {[
            { id: 0, label: 'Orders', icon: ShoppingBag, count: orders.length },
            { id: 1, label: 'Wishlist', icon: Heart, count: wishlist.length },
            { id: 2, label: 'Addresses', icon: MapPin, count: addresses.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Save tab state to localStorage
                localStorage.setItem('buyerDashboardTab', tab.id.toString());
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

        {/* Orders Tab */}
        {activeTab === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No orders yet</p>
                <Link to="/market" className="btn-primary inline-flex items-center space-x-2">
                  <span>Start Shopping</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  // Handle new order structure
                  const orderItems = order.order_items || [];
                  const firstProductName = order.first_product_name || (orderItems[0]?.product_name) || 'Product';
                  const itemCount = order.item_count || orderItems.length || 1;
                  const totalAmount = order.total_amount || order.total_price || 0;
                  const orderNumber = order.order_number || `#${order.id}`;
                  
                  return (
                    <div
                      key={order.id}
                      className="glass rounded-xl p-6 border border-white/20 dark:border-gray-700/20 hover:shadow-lg transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                              {firstProductName}
                              {itemCount > 1 && ` + ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-semibold">Items:</span> {itemCount}</p>
                            <p><span className="font-semibold">Order:</span> {orderNumber}</p>
                            <p><span className="font-semibold">Date:</span> {formatDate(order.created_at)}</p>
                            {order.redx_tracking_number && (
                              <p><span className="font-semibold">Tracking:</span> {order.redx_tracking_number}</p>
                            )}
                          </div>
                          {order.recipient_address && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              <span className="font-semibold">Delivery:</span> {order.recipient_address}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <p className="text-2xl font-bold gradient-text">{formatCurrency(totalAmount)}</p>
                          {getStatusIcon(order.status)}
                          {order.payment_status === 'pending' && order.status === 'pending' && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await api.post(`/api/v1/orders/${order.id}/payment/initiate/`);
                                  const paymentData = response.data?.data || response.data;
                                  if (paymentData?.gateway_url) {
                                    window.location.href = paymentData.gateway_url;
                                  } else {
                                    toast.error('Failed to initiate payment');
                                  }
                                } catch (error) {
                                  toast.error(error.response?.data?.message || 'Failed to initiate payment');
                                }
                              }}
                              className="btn-primary px-4 py-2 text-sm flex items-center space-x-2 mt-2"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Pay Now</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : wishlist.length === 0 ? (
              <div className="text-center py-20">
                <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">Your wishlist is empty</p>
                <Link to="/market" className="btn-primary inline-flex items-center space-x-2">
                  <span>Browse Products</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => {
                  const product = item.product || item;
                  return (
                    <div
                      key={product.id}
                      className="glass rounded-xl overflow-hidden hover:shadow-lg transition-all group relative"
                    >
                      <Link
                        to={`/product/${product.id}`}
                        className="block"
                      >
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-100 to-amber-100 dark:from-green-900 dark:to-amber-900">
                          <img
                            src={product.image || 'https://via.placeholder.com/400x300?text=Product'}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{product.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {product.seller_name || product.farmer_name || 'Local Farm'}
                          </p>
                          <p className="text-xl font-bold gradient-text">
                            {formatCurrency(product.price || 0)} per {product.unit || 'kg'}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleRemoveFromWishlist(product.id)}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
                        title="Remove from wishlist"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Addresses Tab */}
        {activeTab === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-20">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No saved addresses</p>
                <button className="btn-primary">Add Address</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`glass rounded-xl p-6 border-2 ${
                      address.is_default
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                        : 'border-transparent hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5 text-primary-500" />
                        <h3 className="font-semibold text-gray-800 dark:text-white">{address.label}</h3>
                        {address.is_default && (
                          <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{address.address}</p>
                    <div className="mt-4 flex space-x-2">
                      <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                        Edit
                      </button>
                      {!address.is_default && (
                        <button className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                          Set as Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default BuyerDashboardPage;

