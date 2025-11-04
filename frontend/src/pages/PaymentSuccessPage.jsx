import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useCache } from '../hooks/useCache';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get('order_id');
  const orderNumber = searchParams.get('order_number');
  const { getCached } = useCache();

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrderDetails = async () => {
    try {
      const response = await getCached(`/api/v1/orders/${orderId}/`, {}, { cacheTTL: 0 });
      
      // Handle APIResponse format: {status, message, data: {...}} or direct order object
      let orderData;
      if (response?.data && typeof response.data === 'object' && (response.data.id || response.data.order_number)) {
        // APIResponse format with order data
        orderData = response.data;
      } else if (response && typeof response === 'object' && (response.id || response.order_number)) {
        // Direct order object
        orderData = response;
      } else {
        // Fallback: use whatever is available
        orderData = response?.data || response;
      }
      
      // Ensure numeric fields are numbers (not strings from JSON)
      if (orderData) {
        if (orderData.total_amount !== undefined && orderData.total_amount !== null) {
          orderData.total_amount = typeof orderData.total_amount === 'string' 
            ? parseFloat(orderData.total_amount) 
            : Number(orderData.total_amount);
          if (isNaN(orderData.total_amount)) orderData.total_amount = 0;
        }
        if (orderData.subtotal !== undefined && orderData.subtotal !== null) {
          orderData.subtotal = typeof orderData.subtotal === 'string'
            ? parseFloat(orderData.subtotal)
            : Number(orderData.subtotal);
          if (isNaN(orderData.subtotal)) orderData.subtotal = 0;
        }
        if (orderData.delivery_fee !== undefined && orderData.delivery_fee !== null) {
          orderData.delivery_fee = typeof orderData.delivery_fee === 'string'
            ? parseFloat(orderData.delivery_fee)
            : Number(orderData.delivery_fee);
          if (isNaN(orderData.delivery_fee)) orderData.delivery_fee = 0;
        }
      }
      setOrder(orderData);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-amber-50 to-green-100 dark:from-gray-900 dark:via-green-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-amber-50 to-green-100 dark:from-gray-900 dark:via-green-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="glass-strong rounded-3xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Your order has been placed successfully.
          </p>

          {/* Order Details */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6 mb-6 text-left"
            >
              <h2 className="text-xl font-semibold mb-4">Order Details</h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span className="font-semibold">Order Number:</span>
                  <span>{order.order_number || orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-lg font-bold gradient-text">
                    ৳{(() => {
                      const amount = order.total_amount;
                      if (!amount && amount !== 0) return '0.00';
                      const num = typeof amount === 'number' ? amount : parseFloat(amount);
                      return isNaN(num) ? '0.00' : num.toFixed(2);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Payment Status:</span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                    Paid
                  </span>
                </div>
                {order.redx_tracking_number && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold flex items-center space-x-2">
                      <Truck className="w-4 h-4" />
                      <span>Tracking Number:</span>
                    </span>
                    <span className="font-mono text-sm">{order.redx_tracking_number}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/my-orders"
              className="btn-primary inline-flex items-center justify-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>View Orders</span>
            </Link>
            <Link
              to="/market"
              className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all inline-flex items-center justify-center space-x-2"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Info Message */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            You will receive an email confirmation shortly. Your order will be delivered within 2-3 business days.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;

