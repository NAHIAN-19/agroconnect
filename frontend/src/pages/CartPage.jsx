import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft,
  CreditCard,
  Package,
  CheckCircle,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import { formatCurrency } from '../utils/formatters';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressData, setAddressData] = useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    recipient_city: 'Dhaka',
    recipient_area: '',
    recipient_postcode: '',
  });

  // Load address from buyer profile if available
  useEffect(() => {
    if (user && user.buyer_profile) {
      const hasAddress = user.buyer_profile.delivery_address;
      setAddressData({
        recipient_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '',
        recipient_phone: user.phone_number || '',
        recipient_address: hasAddress || '',
        recipient_city: 'Dhaka',
        recipient_area: '',
        recipient_postcode: '',
      });
      // Show form if address is not set
      if (!hasAddress) {
        setShowAddressForm(true);
      }
    } else if (user) {
      // User exists but no profile - show form
      setAddressData({
        recipient_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '',
        recipient_phone: user.phone_number || '',
        recipient_address: '',
        recipient_city: 'Dhaka',
        recipient_area: '',
        recipient_postcode: '',
      });
      setShowAddressForm(true);
    }
  }, [user]);

  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = 50;
  const grandTotal = total + deliveryFee;

  // Check if user is admin verified
  const isVerified = user?.is_admin_verified === true;

  const handlePlaceOrder = async () => {
    // Check admin verification
    if (!isVerified) {
      toast.error('Your account needs to be verified by an administrator before placing orders. Please wait for verification.');
      return;
    }

    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate address data
    if (!addressData.recipient_name || !addressData.recipient_phone || !addressData.recipient_address) {
      toast.error('Please fill in all required delivery information');
      setShowAddressForm(true);
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        recipient_name: addressData.recipient_name,
        recipient_phone: addressData.recipient_phone,
        recipient_address: addressData.recipient_address,
        recipient_city: addressData.recipient_city,
        recipient_area: addressData.recipient_area || undefined,
        recipient_postcode: addressData.recipient_postcode || undefined,
        payment_method: 'sslcommerz',
        delivery_fee: deliveryFee,
      };

      // Always try to post to backend (remove demo mode check for orders)
      console.log('Placing order:', orderData);
      
      const response = await api.post('/api/v1/orders/', orderData);
      
      // Handle APIResponse format
      const orderResponse = response.data?.data || response.data;
      const orderId = orderResponse?.id || orderResponse?.id;
      
      if (!orderId) {
        throw new Error('Order ID not received');
      }
      
      toast.success(response.data?.message || 'Order created successfully! Redirecting to payment...');
      
      // Initiate payment
      try {
        const paymentResponse = await api.post(`/api/v1/orders/${orderId}/payment/initiate/`);
        const paymentData = paymentResponse.data?.data || paymentResponse.data;
        
        if (paymentData?.gateway_url) {
          // Redirect to SSLCommerz payment gateway
          window.location.href = paymentData.gateway_url;
        } else {
          throw new Error('Payment gateway URL not received');
        }
      } catch (paymentError) {
        console.error('Payment initiation error:', paymentError);
        toast.error('Failed to initiate payment. Order saved. Please try again from your orders page.');
        clearCart();
        navigate('/my-orders');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors || 
                          error.message || 
                          'Failed to place order';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
              Shopping Cart
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            onClick={() => navigate('/market')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Continue Shopping</span>
          </button>
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-12 text-center"
          >
            <ShoppingCart className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Add some fresh produce to get started!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/market')}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Browse Marketplace</span>
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="md:col-span-2 space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass rounded-2xl p-6 hover:shadow-floating transition-all"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-amber-100 flex-shrink-0">
                      <img
                        src={item.image || 'https://via.placeholder.com/200?text=Product'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {formatCurrency(item.price || 0)} per {item.unit || 'kg'}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stock || item.maxQuantity || 999}
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              const maxValue = Math.min(item.stock || item.maxQuantity || 999, 999);
                              const clampedValue = Math.max(1, Math.min(value, maxValue));
                              updateQuantity(item.id, clampedValue);
                            }}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              const maxValue = Math.min(item.stock || item.maxQuantity || 999, 999);
                              const clampedValue = Math.max(1, Math.min(value, maxValue));
                              if (clampedValue !== item.quantity) {
                                updateQuantity(item.id, clampedValue);
                              }
                            }}
                            className="w-12 text-center font-semibold text-gray-800 dark:text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                            style={{ appearance: 'textfield' }}
                          />
                          <button
                            onClick={() => {
                              const maxValue = Math.min(item.stock || item.maxQuantity || 999, 999);
                              updateQuantity(item.id, Math.min(item.quantity + 1, maxValue));
                            }}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity >= Math.min(item.stock || item.maxQuantity || 999, 999)}
                          >
                            <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-xl font-bold gradient-text">
                        {formatCurrency((item.price || 0) * item.quantity)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="md:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-strong rounded-2xl p-6 sticky top-24"
              >
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Subtotal ({itemCount} items)</span>
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Delivery (RedX)</span>
                    <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white">
                      <span>Total</span>
                      <span className="gradient-text">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      Payment Method
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Secure payment via SSL Commerz
                  </p>
                </div>

                {/* Delivery Address Form */}
                {showAddressForm && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
                        <MapPin className="w-5 h-5" />
                        <span>Delivery Address</span>
                      </h3>
                      <button
                        onClick={() => setShowAddressForm(false)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Recipient Name *
                        </label>
                        <input
                          type="text"
                          value={addressData.recipient_name}
                          onChange={(e) => setAddressData({ ...addressData, recipient_name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="Full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={addressData.recipient_phone}
                          onChange={(e) => setAddressData({ ...addressData, recipient_phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="01712345678"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Address *
                        </label>
                        <textarea
                          value={addressData.recipient_address}
                          onChange={(e) => setAddressData({ ...addressData, recipient_address: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="Street address, house number"
                          rows={3}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                            City
                          </label>
                          <input
                            type="text"
                            value={addressData.recipient_city}
                            onChange={(e) => setAddressData({ ...addressData, recipient_city: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="Dhaka"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                            Area
                          </label>
                          <input
                            type="text"
                            value={addressData.recipient_area}
                            onChange={(e) => setAddressData({ ...addressData, recipient_area: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="Gulshan"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          Postcode
                        </label>
                        <input
                          type="text"
                          value={addressData.recipient_postcode}
                          onChange={(e) => setAddressData({ ...addressData, recipient_postcode: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="1212"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.button
                  onClick={handlePlaceOrder}
                  disabled={loading || !isVerified}
                  whileHover={{ scale: loading || !isVerified ? 1 : 1.02 }}
                  whileTap={{ scale: loading || !isVerified ? 1 : 0.98 }}
                  className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>Placing Order...</span>
                    </>
                  ) : !isVerified ? (
                    <>
                      <Package className="w-5 h-5" />
                      <span>Account Verification Required</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Place Order</span>
                    </>
                  )}
                </motion.button>

                {!isVerified && (
                  <p className="text-sm text-center text-yellow-600 dark:text-yellow-400 mt-2">
                    Your account needs administrator verification before placing orders.
                  </p>
                )}

                {!showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="w-full mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Update delivery address
                  </button>
                )}

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                  Your order will be delivered by RedX within 2-3 business days
                </p>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
