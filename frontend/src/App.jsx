import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/useAuthStore';
import { initUploadService } from './utils/uploadService';

// Lazy load pages
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyOTPPage = lazy(() => import('./pages/VerifyOTPPage'));
const SetupProfilePage = lazy(() => import('./pages/SetupProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const DashboardRouter = lazy(() => import('./pages/DashboardRouter'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SellerStorePage = lazy(() => import('./pages/SellerStorePage'));
const BuyerStorePage = lazy(() => import('./pages/BuyerStorePage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('./pages/PaymentFailedPage'));
const PaymentCancelledPage = lazy(() => import('./pages/PaymentCancelledPage'));

const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth state on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Initialize upload service (Service Worker) on app load
  useEffect(() => {
    initUploadService().catch((error) => {
      console.error('Failed to initialize upload service:', error);
    });
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/market" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Public store pages */}
            <Route path="/store/seller/:id" element={<SellerStorePage />} />
            <Route path="/store/buyer/:id" element={<BuyerStorePage />} />
            
            {/* Payment callback pages (public - called by SSLCommerz) */}
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/failed" element={<PaymentFailedPage />} />
            <Route path="/payment/cancelled" element={<PaymentCancelledPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/setup-profile" element={<SetupProfilePage />} />
              <Route path="/market" element={<MarketplacePage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/my-orders" element={<OrderHistoryPage />} />
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

