import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, RefreshCw, ArrowLeft } from 'lucide-react';

const PaymentCancelledPage = () => {
  const [searchParams] = useSearchParams();
  const tranId = searchParams.get('tran_id');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 dark:from-gray-900 dark:via-yellow-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="glass-strong rounded-3xl p-8 md:p-12 text-center">
          {/* Cancelled Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-24 h-24 bg-yellow-500 rounded-full mb-6"
          >
            <X className="w-12 h-12 text-white" />
          </motion.div>

          {/* Cancelled Message */}
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            Payment Cancelled
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
            You cancelled the payment process.
          </p>
          {tranId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Transaction ID: {tranId}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              to="/cart"
              className="btn-primary inline-flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Try Again</span>
            </Link>
            <Link
              to="/market"
              className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all inline-flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Shopping</span>
            </Link>
          </div>

          {/* Info Message */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            Your order has been saved. You can complete the payment later from your orders page.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCancelledPage;

