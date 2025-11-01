import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load the pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const VerifyOTPPage = React.lazy(() => import('./pages/VerifyOTPPage'));
const ProfileSetupPage = React.lazy(() => import('./pages/ProfileSetupPage'));
const MarketplacePage = React.lazy(() => import('./pages/MarketplacePage'));
const FarmerHubPage = React.lazy(() => import('./pages/FarmerHubPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const OrderHistoryPage = React.lazy(() => import('./pages/OrderHistoryPage'));

const App = () => {
  return (
    <Router>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />

          {/* Protected Routes */}
          <Route path="/setup-profile" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><FarmerHubPage /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />

          {/* Default Route */}
          <Route path="/" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
