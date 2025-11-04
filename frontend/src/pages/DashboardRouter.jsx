import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import BuyerDashboardPage from './BuyerDashboardPage';
import SellerDashboardPage from './SellerDashboardPage';

const DashboardRouter = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route based on user role
  if (user.role === 'SELLER' || user.role === 'seller') {
    return <SellerDashboardPage />;
  } else if (user.role === 'BUYER' || user.role === 'buyer') {
    return <BuyerDashboardPage />;
  } else {
    // Default to buyer dashboard if role is unclear
    return <BuyerDashboardPage />;
  }
};

export default DashboardRouter;

