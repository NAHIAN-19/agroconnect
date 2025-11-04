import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  Calendar,
  CheckCircle2,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCache } from '../hooks/useCache';
import { demoBuyerOrders, formatCurrency, formatDate } from '../data/demoData';

const BuyerStorePage = () => {
  const { id } = useParams();
  const [buyer, setBuyer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getCached } = useCache();

  useEffect(() => {
    fetchBuyerData();
  }, [id]);

  const fetchBuyerData = async () => {
    setLoading(true);
    try {
      if (import.meta.env.VITE_USE_DEMO === 'true' || !import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Demo buyer data
        const demoBuyer = {
          id: parseInt(id) || 1,
          business_name: 'Fresh Market Co.',
          delivery_address: '456 Main Street, Dhaka, Bangladesh',
          email: 'freshmarket@example.com',
          phone: '+880 9876 543210',
          verified: true,
          total_orders: 15,
          joined_date: '2023-03-20',
        };
        
        setBuyer(demoBuyer);
        // Show buyer's recent orders (in a real app, these would be public orders)
        setOrders(demoBuyerOrders.slice(0, 3));
        setLoading(false);
        return;
      }

      // Fetch buyer profile
      const buyerData = await getCached(`/api/v1/buyers/${id}/`, {}, { cacheTTL: 5 * 60 * 1000 });
      setBuyer(buyerData);

      // Fetch buyer's public orders (if available)
      const ordersData = await getCached(`/api/v1/buyers/${id}/orders/`, {}, { cacheTTL: 5 * 60 * 1000 });
      setOrders(ordersData || []);
    } catch (error) {
      console.log('Using demo buyer data');
      const demoBuyer = {
        id: parseInt(id) || 1,
        business_name: 'Fresh Market Co.',
        delivery_address: '456 Main Street, Dhaka, Bangladesh',
        email: 'freshmarket@example.com',
        phone: '+880 9876 543210',
        verified: true,
        total_orders: 15,
        joined_date: '2023-03-20',
      };
      setBuyer(demoBuyer);
      setOrders(demoBuyerOrders.slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Buyer not found</p>
          <Link to="/market" className="btn-primary">
            Back to Market
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/market"
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Market
        </Link>

        {/* Buyer Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-sunset rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {buyer.business_name.charAt(0)}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text">
                  {buyer.business_name}
                </h1>
                {buyer.verified && (
                  <div className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                  <ShoppingBag className="w-5 h-5" />
                  <span>{buyer.total_orders || 0} orders</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-5 h-5" />
                  <span>Joined {formatDate(buyer.joined_date)}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Building2 className="w-5 h-5" />
                  <span>{buyer.business_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-5 h-5" />
                  <span>{buyer.delivery_address}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-5 h-5" />
                  <span>{buyer.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Mail className="w-5 h-5" />
                  <span>{buyer.email}</span>
                </div>
              </div>
            </div>
            <button className="btn-primary flex items-center space-x-2 px-6 py-3">
              <Mail className="w-5 h-5" />
              <span>Contact</span>
            </button>
          </div>
        </motion.div>

        {/* Recent Orders (if any) */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-display font-bold mb-6">Recent Activity</h2>
            <div className="glass rounded-2xl p-6 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{order.product_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.quantity} {order.unit} • {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold gradient-text">{formatCurrency(order.total_price)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BuyerStorePage;

