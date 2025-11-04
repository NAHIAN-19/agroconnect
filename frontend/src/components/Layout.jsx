import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Package, 
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import useCartStore from '../store/useCartStore';
import useThemeStore from '../store/useThemeStore';
import UserDropdown from './UserDropdown';
import NotificationBell from './NotificationBell';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuth, user, logout } = useAuthStore();
  const { items } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSeller = user?.role === 'SELLER' || user?.role === 'seller';
  const isBuyer = user?.role === 'BUYER' || user?.role === 'buyer';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-green-50 to-amber-50 dark:from-gray-900 dark:via-green-900 dark:to-gray-800">
      {/* Modern Glassmorphic Navbar */}
      <nav className="glass sticky top-0 z-50 border-b border-white/20 dark:border-gray-700/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to={isAuth ? (isSeller ? '/dashboard' : '/market') : '/'}
              className="flex items-center space-x-2 group"
            >
              <div className="bg-gradient-farm p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">AgroConnect</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuth ? (
                <>
                  {/* Market - Available for all roles */}
                  <Link
                    to="/market"
                    className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all font-medium"
                  >
                    Marketplace
                  </Link>

                  {/* Cart - Available for all roles (seller's own cart for ordering from others) */}
                  <Link
                    to="/cart"
                    className="relative px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>

                  {/* Orders - Available for all roles (tracking own parcels) */}
                  <Link
                    to="/my-orders"
                    className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all font-medium"
                  >
                    Orders
                  </Link>

                  {/* Dashboard - Role specific */}
                  {isSeller && (
                    <Link
                      to="/dashboard"
                      className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all font-medium"
                    >
                      Dashboard
                    </Link>
                  )}
                  {isBuyer && (
                    <Link
                      to="/dashboard"
                      className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all font-medium"
                    >
                      Dashboard
                    </Link>
                  )}

                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all"
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  {/* Notifications (only for sellers) */}
                  {isSeller && <NotificationBell />}

                  {/* User Dropdown */}
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary px-6 py-2 text-base"
                  >
                    Register
                  </Link>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all"
                  >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-gray-700 dark:text-gray-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong border-t border-white/20 dark:border-gray-700/20"
          >
            <div className="px-4 py-4 space-y-2">
              {isAuth ? (
                <>
                  {/* Market - Available for all roles */}
                  <Link
                    to="/market"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    Marketplace
                  </Link>

                  {/* Cart - Available for all roles */}
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    Cart ({cartItemCount})
                  </Link>

                  {/* Orders - Available for all roles */}
                  <Link
                    to="/my-orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    Orders
                  </Link>

                  {/* Dashboard - Role specific */}
                  {isSeller && (
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                    >
                      Dashboard
                    </Link>
                  )}
                  {isBuyer && (
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                    >
                      Dashboard
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    Profile & Settings
                  </Link>
                  <button
                    onClick={() => {
                      toggleTheme();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    Toggle Theme
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 rounded-xl bg-gradient-farm text-white text-center"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="glass border-t border-white/20 dark:border-gray-700/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 AgroConnect. Connecting farmers and buyers in Bangladesh.</p>
            <p className="text-sm mt-2">Payment: SSL Commerz | Delivery: RedX</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
