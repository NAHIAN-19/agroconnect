import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ProtectedRoute = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const isAuth = useAuthStore((state) => state.isAuth);
  const access_token = useAuthStore((state) => state.access_token);
  const user = useAuthStore((state) => state.user);
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth state on mount
  useEffect(() => {
    try {
      initialize();
      // Small delay to ensure Zustand state is updated
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 50);
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsInitialized(true);
    }
  }, [initialize]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  // Check if authenticated - need both token and user
  const authenticated = isAuth && access_token && user;

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

