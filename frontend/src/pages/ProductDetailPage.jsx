import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Star, 
  Package, 
  CheckCircle2, 
  User,
  MapPin,
  Heart,
  Share2,
  Minus,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useCache } from '../hooks/useCache';
import { formatCurrency } from '../data/demoData';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import useWishlistStore from '../store/useWishlistStore';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { getCached } = useCache();
  const addToCart = useCartStore((state) => state.addToCart);
  const user = useAuthStore((state) => state.user);
  const { fetchWishlist, isInWishlist, addToWishlist, removeFromWishlist, wishlist } = useWishlistStore();

  // Check if product belongs to current user (seller)
  const isOwnProduct = useMemo(() => {
    if (!user || !product || user.role !== 'SELLER') return false;
    return product.seller_id === user.id || product.farmer_id === user.id;
  }, [user, product]);

  // Fetch wishlist on mount if not already fetched
  useEffect(() => {
    if (user && user.id && wishlist.length === 0) {
      fetchWishlist();
    }
  }, [user, fetchWishlist, wishlist.length]);

  const isProductInWishlist = useMemo(() => {
    if (!product?.id) return false;
    return isInWishlist(product.id);
  }, [product, isInWishlist, wishlist]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await getCached(`/api/v1/products/${id}/`, {}, { cacheTTL: 5 * 60 * 1000 });
        
        // Handle API response format: {status, message, data: {...}}
        // getCached returns response.data, so we get: {status, message, data: {...}}
        let productData = null;
        if (response?.data && typeof response.data === 'object' && response.data.id) {
          productData = response.data;
        } else if (response && typeof response === 'object' && response.id) {
          // Fallback: if response is directly the product object
          productData = response;
        }
        
        if (productData && productData.id) {
          setProduct(productData);
        } else {
          toast.error('Product not found');
          navigate('/market');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch product';
        toast.error(errorMsg);
        navigate('/market');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, getCached, navigate]);

  const handleAddToCart = () => {
    if (!product || product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }
    
    // Prevent sellers from adding their own products
    if (isOwnProduct) {
      toast.error('You cannot add your own products to cart');
      return;
    }
    
    addToCart(product, quantity);
    toast.success(`${quantity} ${product.name} added to cart!`);
  };

  const handleWishlistToggle = async () => {
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

  const adjustQuantity = (delta) => {
    const newQuantity = quantity + delta;
    const maxQuantity = Math.min(product?.stock || 0, 100);
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Product not found</p>
          <button
            onClick={() => navigate('/market')}
            className="btn-primary"
          >
            Back to Market
          </button>
        </div>
      </div>
    );
  }

  // Create image array (in real app, product.images would be an array)
  const images = product.images || [product.image || 'https://via.placeholder.com/800x600?text=Product'];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/market')}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Market
        </motion.button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="glass rounded-3xl overflow-hidden aspect-square bg-gradient-to-br from-green-100 to-amber-100 dark:from-green-900 dark:to-amber-900">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass-strong rounded-3xl p-8">
              {/* Badges and Wishlist */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {product.verified && (
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full flex items-center space-x-1 text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified</span>
                    </div>
                  )}
                  {product.stock <= 10 && product.stock > 0 && (
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Low Stock
                    </div>
                  )}
                  {product.category && (
                    <div className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm font-semibold">
                      {product.category}
                    </div>
                  )}
                </div>
                {user && user.id && (
                  <button
                    onClick={handleWishlistToggle}
                    disabled={wishlistLoading}
                    className={`p-2 rounded-full shadow-lg transition-all ${
                      isInWishlist
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text mb-4">
                {product.name}
              </h1>

              {/* Rating */}
              {product.rating && (
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? 'fill-accent-500 text-accent-500'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {product.rating}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    ({product.reviews || 0} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <p className="text-5xl font-bold gradient-text mb-2">
                  {formatCurrency(product.price || 0)}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  per {product.unit || 'kg'}
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-xl font-display font-bold text-gray-800 dark:text-white mb-2">Description</h3>
                <p className="text-body text-gray-600 dark:text-gray-300 leading-relaxed">
                  {product.description || 'No description available.'}
                </p>
              </div>

              {/* Seller/Farmer Info */}
              {(product.farmer_name || product.seller_name) && (
                <Link
                  to={`/store/seller/${product.seller_id || product.farmer_id || 1}`}
                  className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors block"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-500 p-2 rounded-full">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Seller</p>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {product.farmer_name || product.seller_name}
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-primary-600 dark:text-primary-400 transform rotate-180" />
                  </div>
                </Link>
              )}

              {/* Stock Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Stock Available</p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {product.stock || 0} {product.unit || 'kg'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => adjustQuantity(-1)}
                    disabled={quantity <= 1}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={Math.min(product.stock || 0, 100)}
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxQuantity = Math.min(product.stock || 0, 100);
                      const clampedValue = Math.max(1, Math.min(value, maxQuantity));
                      setQuantity(clampedValue);
                    }}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxQuantity = Math.min(product.stock || 0, 100);
                      const clampedValue = Math.max(1, Math.min(value, maxQuantity));
                      setQuantity(clampedValue);
                    }}
                    className="text-2xl font-bold text-gray-800 dark:text-white min-w-[3rem] text-center bg-transparent border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    style={{ appearance: 'textfield' }}
                  />
                  <button
                    onClick={() => adjustQuantity(1)}
                    disabled={quantity >= Math.min(product.stock || 0, 100)}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {product.stock > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Maximum {Math.min(product.stock, 100)} available
                  </p>
                )}
              </div>

              {/* Add to Cart Button */}
              <motion.button
                whileHover={!isOwnProduct && product.stock > 0 ? { scale: 1.02 } : {}}
                whileTap={!isOwnProduct && product.stock > 0 ? { scale: 0.98 } : {}}
                onClick={handleAddToCart}
                disabled={!product.stock || product.stock === 0 || isOwnProduct}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all text-lg ${
                  isOwnProduct
                    ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed'
                    : product.stock > 0
                    ? 'bg-gradient-farm text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-6 h-6" />
                <span>
                  {isOwnProduct
                    ? 'Your Product'
                    : product.stock > 0 
                    ? `Add ${quantity} to Cart` 
                    : 'Out of Stock'}
                </span>
              </motion.button>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button className="flex-1 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 flex items-center justify-center space-x-2 transition-all">
                  <Heart className="w-5 h-5" />
                  <span>Save</span>
                </button>
                <button className="flex-1 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 flex items-center justify-center space-x-2 transition-all">
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;

