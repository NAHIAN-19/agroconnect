import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Package,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  ShoppingBag,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useCache } from '../hooks/useCache';
import { formatCurrency, formatDate } from '../data/demoData';
import ProductCard from '../components/ProductCard';

const SellerStorePage = () => {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getCached } = useCache();

  useEffect(() => {
    fetchSellerData();
  }, [id]);

  const fetchSellerData = async () => {
    setLoading(true);
    try {
      // Fetch seller profile - try profile endpoint first
      let sellerData = null;
      try {
        const profileResponse = await api.get(`/api/v1/profile/${id}/`);
        let profileData = profileResponse?.data?.data || profileResponse?.data;
        
        if (profileData) {
          // Extract seller profile info
          const sellerProfile = profileData.seller_profile || profileData.profile || {};
          sellerData = {
            id: profileData.id || id,
            store_name: sellerProfile.store_name || profileData.full_name || 'Seller',
            email: profileData.email || '',
            phone: sellerProfile.phone || profileData.phone || '',
            pickup_address: sellerProfile.pickup_address || '',
            verified: profileData.is_admin_verified || false,
            date_joined: profileData.date_joined || profileData.created_at || null,
            picture: sellerProfile.picture || profileData.avatar_url || null,
          };
        }
      } catch (profileError) {
        console.log('Profile endpoint not available, will derive from products');
      }
      
      // Fetch seller products - ensure we only get products from this specific seller
      const productsResponse = await getCached(`/api/v1/products/?seller_id=${id}`, {}, { cacheTTL: 5 * 60 * 1000 });
      
      let products = [];
      if (productsResponse?.data?.results && Array.isArray(productsResponse.data.results)) {
        products = productsResponse.data.results;
      } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
        products = productsResponse.data;
      } else if (Array.isArray(productsResponse)) {
        products = productsResponse;
      }
      
      // SECURITY: Filter to ensure only products from this seller are shown
      products = products.filter(p => {
        const productSellerId = p.seller_id || p.farmer_id;
        return productSellerId === parseInt(id);
      });
      
      setProducts(products);
      
      // Calculate seller ratings from products
      const productsWithRatings = products.filter(p => p.rating);
      const averageRating = productsWithRatings.length > 0
        ? productsWithRatings.reduce((sum, p) => sum + (p.rating || 0), 0) / productsWithRatings.length
        : 0;
      const totalReviews = products.reduce((sum, p) => sum + (p.reviews || 0), 0);
      
      // If seller data not fetched from profile, derive from products
      if (!sellerData && products.length > 0) {
        const firstProduct = products[0];
        sellerData = {
          id: firstProduct.seller_id || firstProduct.farmer_id || id,
          store_name: firstProduct.farmer_name || firstProduct.seller_name || 'Seller',
          email: '',
          phone: '',
          pickup_address: '',
          verified: firstProduct.verified || false,
          date_joined: null,
          picture: null,
        };
      }
      
      // Update seller data with ratings
      if (sellerData) {
        sellerData.rating = averageRating;
        sellerData.total_reviews = totalReviews;
        sellerData.total_products = products.length;
        setSeller(sellerData);
      }

      // Fetch seller reviews
      const reviewsResponse = await getCached(`/api/v1/reviews/?seller=${id}`, {}, { cacheTTL: 5 * 60 * 1000 });
      
      let reviews = [];
      if (reviewsResponse?.data?.results && Array.isArray(reviewsResponse.data.results)) {
        reviews = reviewsResponse.data.results;
      } else if (reviewsResponse?.data && Array.isArray(reviewsResponse.data)) {
        reviews = reviewsResponse.data;
      } else if (Array.isArray(reviewsResponse)) {
        reviews = reviewsResponse;
      }
      
      setReviews(reviews);
    } catch (error) {
      console.error('Error fetching seller data:', error);
      toast.error('Failed to load seller information');
      setProducts([]);
      setReviews([]);
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

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Seller not found</p>
          <Link to="/market" className="btn-primary">
            Back to Market
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link
          to="/market"
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Market
        </Link>

        {/* Seller Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              {seller.picture ? (
                <img
                  src={seller.picture}
                  alt={seller.store_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-farm rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {seller.store_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text">
                  {seller.store_name}
                </h1>
                {seller.verified && (
                  <div className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 fill-accent-500 text-accent-500" />
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {seller.rating?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    ({seller.total_reviews || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                  <Package className="w-5 h-5" />
                  <span>{seller.total_products || 0} products</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {seller.pickup_address && (
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-5 h-5" />
                    <span>{seller.pickup_address}</span>
                  </div>
                )}
                {seller.phone && (
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Phone className="w-5 h-5" />
                    <span>{seller.phone}</span>
                  </div>
                )}
                {seller.email && (
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Mail className="w-5 h-5" />
                    <span>{seller.email}</span>
                  </div>
                )}
                {seller.date_joined && (
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <TrendingUp className="w-5 h-5" />
                    <span>Joined {formatDate(seller.date_joined)}</span>
                  </div>
                )}
              </div>
            </div>
            <button className="btn-primary flex items-center space-x-2 px-6 py-3">
              <MessageSquare className="w-5 h-5" />
              <span>Contact Seller</span>
            </button>
          </div>
        </motion.div>

        {/* Products Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-display font-bold mb-6">Products ({products.length})</h2>
          {products.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400">No products available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-display font-bold mb-6">Reviews ({reviews.length})</h2>
            <div className="glass rounded-2xl p-6 space-y-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-6 last:pb-0"
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={review.buyer_avatar}
                      alt={review.buyer_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 dark:text-white">{review.buyer_name}</h4>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-accent-500 text-accent-500'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{review.product_name}</p>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">{review.comment}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(review.created_at)}</p>
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

export default SellerStorePage;

