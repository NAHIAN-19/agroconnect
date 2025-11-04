import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  X,
  Star,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useCache } from '../hooks/useCache';
import { formatCurrency, formatDate } from '../data/demoData';
import useAuthStore from '../store/useAuthStore';

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewModal, setReviewModal] = useState({ 
    open: false, 
    orderId: null,
    orderNumber: null,
    existingReview: null
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [trackingModal, setTrackingModal] = useState({ 
    open: false, 
    orderId: null, 
    orderNumber: null,
    status: null,
    trackingNumber: null,
    shippingStatus: null,
    recipientAddress: null,
    shippedAt: null,
    deliveredAt: null,
    redxTracking: [],
    redxParcelInfo: null
  });
  const user = useAuthStore((state) => state.user);
  const { getCached } = useCache();

  useEffect(() => {
    if (user && user.id) {
      fetchOrders();
    }
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user || !user.id) {
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
        // Check if order belongs to current user (order should have buyer_id or buyer field)
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
      
      if (userOrders.length === 0) {
        toast('No orders found', { duration: 2000, icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load orders';
      toast.error(errorMsg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (orderId) => {
    try {
      const response = await api.get(`/api/v1/orders/${orderId}/track/`);
      
      // Handle APIResponse format
      const trackingData = response.data?.data || response.data;
      
      setTrackingModal({ 
        open: true, 
        orderId,
        orderNumber: trackingData.order_number,
        status: trackingData.status,
        trackingNumber: trackingData.redx_tracking_number,
        shippingStatus: trackingData.shipping_status,
        recipientAddress: trackingData.recipient_address,
        shippedAt: trackingData.shipped_at,
        deliveredAt: trackingData.delivered_at,
        redxTracking: trackingData.redx_tracking || [],
        redxParcelInfo: trackingData.redx_parcel_info || null
      });
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch tracking information');
    }
  };

  const handlePayment = async (orderId) => {
    try {
      const response = await api.post(`/api/v1/orders/${orderId}/payment/initiate/`);
      const paymentData = response.data?.data || response.data;
      
      if (paymentData?.gateway_url) {
        window.location.href = paymentData.gateway_url;
      } else {
        toast.error('Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      const response = await api.get(`/api/v1/orders/${orderId}/`);
      const orderData = response.data?.data || response.data;
      setSelectedOrder(orderData);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error(error.response?.data?.message || 'Failed to load order details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'paid':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 text-purple-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
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
          <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text mb-4">
            Order History
          </h1>
          <p className="text-lg font-body text-gray-600 dark:text-gray-300">
            Track and manage all your orders
          </p>
        </motion.div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-12 text-center"
          >
            <ShoppingBag className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              No orders yet
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start shopping to see your orders here
            </p>
            <Link
              to="/market"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Browse Marketplace</span>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => {
              const orderItems = order.order_items || [];
              const firstProductName = order.first_product_name || (orderItems[0]?.product_name) || 'Product';
              const itemCount = order.item_count || orderItems.length || 1;
              const totalAmount = order.total_amount || order.total_price || 0;
              const orderNumber = order.order_number || `#${order.id}`;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border-2 border-green-200 dark:border-green-800/50 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                            {orderNumber}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {firstProductName}
                            {itemCount > 1 && ` + ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {itemCount} item{itemCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        {order.redx_tracking_number && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {order.redx_tracking_number}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-bold gradient-text">
                            {formatCurrency(totalAmount)}
                          </span>
                        </div>
                      </div>

                      {order.recipient_address && (
                        <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                          <span>{order.recipient_address}</span>
                        </div>
                      )}

                      {/* Payment Status */}
                      {order.payment_status && (
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Payment:</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            order.payment_status === 'success' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : order.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-3 md:min-w-[200px]">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                      </div>
                      <div className="flex flex-col space-y-2 w-full md:w-auto">
                        <button
                          onClick={() => handleViewDetails(order.id)}
                          className="btn-primary text-sm py-2 px-4 flex items-center justify-center space-x-2 w-full"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                        <button
                          onClick={() => handleTrack(order.id)}
                          className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm flex items-center justify-center space-x-2 w-full"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Track</span>
                        </button>
                        {order.payment_status === 'pending' && order.status === 'pending' && (
                          <button
                            onClick={() => handlePayment(order.id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all text-sm flex items-center justify-center space-x-2 w-full"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Pay Now</span>
                          </button>
                        )}
                        {/* Review options for shipped/delivered orders */}
                        {(order.status === 'shipped' || order.status === 'delivered') && (
                          <>
                            {order.status === 'delivered' && order.can_review && !order.order_review && (
                              <button
                                onClick={() => {
                                  setReviewModal({
                                    open: true,
                                    orderId: order.id,
                                    orderNumber: orderNumber,
                                    existingReview: order.order_review
                                  });
                                  setReviewForm({ rating: 5, comment: '' });
                                }}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-all text-sm flex items-center justify-center space-x-2 w-full"
                              >
                                <Star className="w-4 h-4" />
                                <span>Review Order</span>
                              </button>
                            )}
                            {order.status === 'delivered' && order.order_review && (
                              <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-sm text-center">
                                <Star className="w-4 h-4 inline mr-1" />
                                <span>Reviewed</span>
                              </div>
                            )}
                            {order.status === 'delivered' && order.days_until_reviewable && order.days_until_reviewable > 0 && !order.order_review && (
                              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs text-center">
                                Review in {order.days_until_reviewable} day{order.days_until_reviewable > 1 ? 's' : ''}
                              </div>
                            )}
                            {order.status === 'shipped' && !order.order_review && (
                              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-xs text-center">
                                <Star className="w-4 h-4 inline mr-1" />
                                <span>Review available after delivery</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Review Modal */}
        <AnimatePresence>
          {reviewModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setReviewModal({ open: false, orderId: null, orderNumber: null, existingReview: null });
                setReviewForm({ rating: 5, comment: '' });
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong rounded-3xl p-8 max-w-md w-full"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold gradient-text">
                    Review Order {reviewModal.orderNumber}
                  </h2>
                  <button
                    onClick={() => {
                      setReviewModal({ open: false, orderId: null, orderNumber: null, existingReview: null });
                      setReviewForm({ rating: 5, comment: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    disabled={submittingReview}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {reviewModal.existingReview ? (
                  <div className="space-y-4">
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800 dark:text-white">Your Rating</span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < reviewModal.existingReview.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {reviewModal.existingReview.comment && (
                        <p className="text-gray-700 dark:text-gray-300 mt-2">
                          {reviewModal.existingReview.comment}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Reviewed on {formatDate(reviewModal.existingReview.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setReviewModal({ open: false, orderId: null, orderNumber: null, existingReview: null });
                        setReviewForm({ rating: 5, comment: '' });
                      }}
                      className="btn-primary w-full"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (submittingReview) return;

                      setSubmittingReview(true);
                      try {
                        const response = await api.post(`/api/v1/orders/${reviewModal.orderId}/review/`, {
                          order: reviewModal.orderId,
                          rating: reviewForm.rating,
                          comment: reviewForm.comment
                        });

                        toast.success('Review submitted successfully!');
                        setReviewModal({ open: false, orderId: null, orderNumber: null, existingReview: null });
                        setReviewForm({ rating: 5, comment: '' });
                        fetchOrders(); // Refresh orders
                      } catch (error) {
                        console.error('Error submitting review:', error);
                        const errorMsg = error.response?.data?.message || 
                                        error.response?.data?.errors || 
                                        error.message || 
                                        'Failed to submit review';
                        toast.error(errorMsg);
                      } finally {
                        setSubmittingReview(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200">
                        Rating *
                      </label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating })}
                            disabled={submittingReview}
                            className={`transition-all ${
                              reviewForm.rating >= rating
                                ? 'text-yellow-400 scale-110'
                                : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                            }`}
                          >
                            <Star
                              className={`w-8 h-8 ${
                                reviewForm.rating >= rating ? 'fill-current' : ''
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          {reviewForm.rating} / 5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                        Comment (Optional)
                      </label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="input-modern"
                        rows={4}
                        placeholder="Share your experience with this order..."
                        disabled={submittingReview}
                      />
                    </div>

                    <div className="flex space-x-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModal({ open: false, orderId: null, orderNumber: null, existingReview: null });
                          setReviewForm({ rating: 5, comment: '' });
                        }}
                        disabled={submittingReview}
                        className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {submittingReview ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4" />
                            <span>Submit Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedOrder(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold gradient-text">
                    Order Details - {selectedOrder.order_number || `#${selectedOrder.id}`}
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Items */}
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                        Order Items
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="glass rounded-xl p-4 flex items-center space-x-4"
                          >
                            {item.product_image && (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 dark:text-white">
                                {item.product_name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Quantity: {item.quantity} {item.unit || 'unit'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold gradient-text">
                                {formatCurrency(item.total_price)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(item.unit_price)} each
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                      Order Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(selectedOrder.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Delivery Fee:</span>
                        <span>{formatCurrency(selectedOrder.delivery_fee || 0)}</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white">
                          <span>Total:</span>
                          <span className="gradient-text">{formatCurrency(selectedOrder.total_amount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                      Delivery Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {selectedOrder.recipient_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {selectedOrder.recipient_phone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">City:</span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {selectedOrder.recipient_city}
                        </span>
                      </div>
                      {selectedOrder.recipient_area && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Area:</span>
                          <span className="font-semibold text-gray-800 dark:text-white">
                            {selectedOrder.recipient_area}
                          </span>
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="text-gray-600 dark:text-gray-400">Address:</span>
                        <p className="font-semibold text-gray-800 dark:text-white mt-1">
                          {selectedOrder.recipient_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[150px] glass rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status?.charAt(0).toUpperCase() + selectedOrder.status?.slice(1) || 'Pending'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-[150px] glass rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedOrder.payment_status === 'success'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : selectedOrder.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedOrder.payment_status?.charAt(0).toUpperCase() + selectedOrder.payment_status?.slice(1) || 'Pending'}
                      </span>
                    </div>
                    {selectedOrder.redx_tracking_number && (
                      <div className="flex-1 min-w-[150px] glass rounded-xl p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tracking Number</p>
                        <p className="font-mono text-sm font-semibold text-gray-800 dark:text-white">
                          {selectedOrder.redx_tracking_number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tracking Modal */}
        <AnimatePresence>
          {trackingModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setTrackingModal({ 
                open: false, 
                orderId: null, 
                orderNumber: null,
                status: null,
                trackingNumber: null,
                shippingStatus: null,
                recipientAddress: null,
                shippedAt: null,
                deliveredAt: null,
                redxTracking: [],
                redxParcelInfo: null
              })}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong rounded-3xl p-8 max-w-md w-full"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold gradient-text">Order Tracking</h2>
                  <button
                    onClick={() => setTrackingModal({ 
                      open: false, 
                      orderId: null, 
                      orderNumber: null,
                      status: null,
                      trackingNumber: null,
                      shippingStatus: null,
                      recipientAddress: null,
                      shippedAt: null,
                      deliveredAt: null
                    })}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Number</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {trackingModal.orderNumber || `#${trackingModal.orderId}`}
                    </p>
                  </div>

                  {trackingModal.trackingNumber && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tracking Number</p>
                      <p className="font-mono text-lg font-bold gradient-text">
                        {trackingModal.trackingNumber}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Status</p>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(trackingModal.status)}`}>
                      {trackingModal.status?.charAt(0).toUpperCase() + trackingModal.status?.slice(1) || 'Pending'}
                    </span>
                  </div>

                  {trackingModal.shippingStatus && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shipping Status</p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {trackingModal.shippingStatus.charAt(0).toUpperCase() + trackingModal.shippingStatus.slice(1)}
                      </p>
                    </div>
                  )}

                  {trackingModal.shippedAt && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shipped On</p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {formatDate(trackingModal.shippedAt)}
                      </p>
                    </div>
                  )}

                  {trackingModal.deliveredAt && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delivered On</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {formatDate(trackingModal.deliveredAt)}
                      </p>
                    </div>
                  )}

                  {trackingModal.recipientAddress && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delivery Address</p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {trackingModal.recipientAddress}
                      </p>
                    </div>
                  )}

                  {/* RedX Tracking Updates */}
                  {trackingModal.redxTracking && trackingModal.redxTracking.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tracking Updates</p>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {trackingModal.redxTracking.map((update, index) => (
                          <div
                            key={index}
                            className="glass rounded-xl p-3 border-l-4 border-primary-500"
                          >
                            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                              {update.message_en || update.message_bn}
                            </p>
                            {update.message_bn && update.message_en && update.message_bn !== update.message_en && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {update.message_bn}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(update.time)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RedX Parcel Info */}
                  {trackingModal.redxParcelInfo && (
                    <div className="mt-6 glass rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Parcel Information</p>
                      <div className="space-y-2 text-sm">
                        {trackingModal.redxParcelInfo.status && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              {trackingModal.redxParcelInfo.status}
                            </span>
                          </div>
                        )}
                        {trackingModal.redxParcelInfo.delivery_area && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Delivery Area:</span>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              {trackingModal.redxParcelInfo.delivery_area}
                            </span>
                          </div>
                        )}
                        {trackingModal.redxParcelInfo.charge && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Delivery Charge:</span>
                            <span className="font-semibold gradient-text">
                              {formatCurrency(trackingModal.redxParcelInfo.charge)}
                            </span>
                          </div>
                        )}
                        {trackingModal.redxParcelInfo.delivery_type && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Delivery Type:</span>
                            <span className="font-semibold text-gray-800 dark:text-white capitalize">
                              {trackingModal.redxParcelInfo.delivery_type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setTrackingModal({ 
                    open: false, 
                    orderId: null, 
                    orderNumber: null,
                    status: null,
                    trackingNumber: null,
                    shippingStatus: null,
                    recipientAddress: null,
                    shippedAt: null,
                    deliveredAt: null,
                    redxTracking: [],
                    redxParcelInfo: null
                  })}
                  className="btn-primary w-full mt-6"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderHistoryPage;

