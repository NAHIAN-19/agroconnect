import { memo, useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, CheckCircle2, Package, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import { formatCurrency } from '../data/demoData';

const ProductCard = memo(({ product }) => {
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  const user = useAuthStore((state) => state.user);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Check if product belongs to current user (seller)
  const isOwnProduct = useMemo(() => {
    if (!user || user.role !== 'SELLER') return false;
    return product.seller_id === user.id || product.farmer_id === user.id;
  }, [user, product]);

  // Check if product is in wishlist
  useEffect(() => {
    if (!user || !user.id) {
      setIsInWishlist(false);
      return;
    }

    const checkWishlist = async () => {
      try {
        const response = await api.get(`/api/v1/wishlist/check/?product_id=${product.id}`);
        if (response?.data?.data?.is_in_wishlist) {
          setIsInWishlist(true);
        }
      } catch (error) {
        // Silently fail - product might not be in wishlist
        setIsInWishlist(false);
      }
    };

    checkWishlist();
  }, [user, product.id]);

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation(); // Prevent navigation when clicking add to cart
    
    // Prevent sellers from adding their own products
    if (isOwnProduct) {
      toast.error('You cannot add your own products to cart');
      return;
    }
    
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation(); // Prevent navigation when clicking wishlist
    
    if (!user || !user.id) {
      toast.error('Please login to add products to wishlist');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        await api.delete('/api/v1/wishlist/remove/', {
          data: { product_id: product.id }
        });
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        // Add to wishlist
        await api.post('/api/v1/wishlist/add/', {
          product_id: product.id
        });
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update wishlist';
      toast.error(errorMsg);
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      className="glass rounded-3xl overflow-hidden card-hover group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Product Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-100 to-amber-100 dark:from-green-900 dark:to-amber-900">
        <img
          src={product.image || 'https://via.placeholder.com/400x300?text=Product'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {user && user.id && (
          <button
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all z-10 ${
              isInWishlist
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
          </button>
        )}
        {product.verified && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full flex items-center space-x-1 text-xs font-semibold shadow-lg">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </div>
        )}
        {product.stock <= 10 && product.stock > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
            Low Stock
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 line-clamp-1">
            {product.name}
          </h3>
          <Link
            to={`/store/seller/${product.seller_id || product.farmer_id || 1}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {product.farmer_name || product.seller_name || 'Local Farm'}
          </Link>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 h-10">
          {product.description || 'Fresh produce from local farmers'}
        </p>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center space-x-1 mb-4">
            <Star className="w-4 h-4 fill-accent-500 text-accent-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {product.rating}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({product.reviews || 0} reviews)
            </span>
          </div>
        )}

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold gradient-text">
              {formatCurrency(product.price || 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              per {product.unit || 'kg'}
            </p>
          </div>
          <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">
              {product.stock || 0} {product.unit || 'kg'}
            </span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <motion.button
          whileHover={!isOwnProduct && product.stock > 0 ? { scale: 1.02 } : {}}
          whileTap={!isOwnProduct && product.stock > 0 ? { scale: 0.98 } : {}}
          onClick={handleAddToCart}
          disabled={!product.stock || product.stock === 0 || isOwnProduct}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
            isOwnProduct
              ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed'
              : product.stock > 0
              ? 'bg-gradient-farm text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>
            {isOwnProduct 
              ? 'Your Product' 
              : product.stock > 0 
              ? 'Add to Cart' 
              : 'Out of Stock'}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
