import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Package,
  ShoppingBag,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const UserDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout, isAuth, setUser } = useAuthStore();
  
  const isSeller = user?.role === 'SELLER' || user?.role === 'seller';
  const isBuyer = user?.role === 'BUYER' || user?.role === 'buyer';
  const isVerified = user?.is_admin_verified === true;

  // Refresh user data from localStorage on mount (ensures avatar_url is current)
  useEffect(() => {
    // Re-read from localStorage to ensure we have the latest avatar_url
    const userStr = localStorage.getItem('user');
    if (userStr && isAuth) {
      try {
        const storedUser = JSON.parse(userStr);
        // Only update if avatar_url is different and exists (avoid unnecessary updates)
        if (storedUser?.avatar_url && storedUser.avatar_url !== user?.avatar_url) {
          setUser({ ...user, ...storedUser });
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]); // Only run once on mount or when auth changes

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  if (!isAuth || !user) {
    return null;
  }

  // Get user display name
  const displayName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
  // Always use avatar_url from user object directly
  const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=059669&color=FFFFFF&size=128`;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all group"
      >
        <div className="relative">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border-2 border-primary-200 dark:border-primary-800"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=059669&color=FFFFFF&size=128`;
            }}
          />
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-24 truncate">
          {displayName}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 glass-strong rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-white/10 dark:border-gray-700/10 bg-gradient-to-r from-primary-500/10 to-accent-500/10">
              <div className="flex items-center space-x-3">
                <img
                  key={user?.avatar_url || 'default-avatar-dropdown'} // Force re-render when avatar_url changes
                  src={avatarUrl}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-200 dark:border-primary-800"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=059669&color=FFFFFF&size=128`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  {isVerified ? (
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 mt-1">
                      <XCircle className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all text-gray-700 dark:text-gray-200 group"
              >
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                <span className="font-medium">Profile & Account</span>
              </Link>

              {(isBuyer || !isSeller) && (
                <>
                  <Link
                    to="/market"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all text-gray-700 dark:text-gray-200 group"
                  >
                    <Package className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                    <span className="font-medium">Marketplace</span>
                  </Link>
                  <Link
                    to="/my-orders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all text-gray-700 dark:text-gray-200 group"
                  >
                    <ShoppingBag className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                    <span className="font-medium">My Orders</span>
                  </Link>
                </>
              )}

              {isSeller && (
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all text-gray-700 dark:text-gray-200 group"
                >
                  <Package className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                  <span className="font-medium">Seller Dashboard</span>
                </Link>
              )}

              {isBuyer && (
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all text-gray-700 dark:text-gray-200 group"
                >
                  <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                  <span className="font-medium">Buyer Dashboard</span>
                </Link>
              )}

              <div className="my-1 h-px bg-white/10 dark:bg-gray-700/10" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-all text-red-600 dark:text-red-400 group"
              >
                <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDropdown;

