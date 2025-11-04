import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid, List, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';
import { useFilter } from '../hooks/useFilter';
import { useCache } from '../hooks/useCache';
import useAuthStore from '../store/useAuthStore';
import { formatCurrency } from '../data/demoData';

const MarketplacePage = () => {
  // Initialize with empty array - will be populated from API
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    category: 'all',
    minPrice: undefined,
    maxPrice: undefined,
    inStock: undefined,
    sortBy: undefined,
    sortOrder: 'asc',
  });
  const { getCached } = useCache();
  const user = useAuthStore((state) => state.user);

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set();
    allProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [allProducts]);

  // Get price range from products
  const priceRange = useMemo(() => {
    if (allProducts.length === 0) return { min: 0, max: 1000 };
    const prices = allProducts.map(p => p.price || 0).filter(p => p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [allProducts]);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await getCached('/api/v1/products/', {}, { cacheTTL: 5 * 60 * 1000 });
        
        // Handle API response format: {status, message, data: {results: [...]}}
        // getCached returns response.data, so we get: {status, message, data: {results: [...]}}
        let products = [];
        if (response?.data?.results && Array.isArray(response.data.results)) {
          products = response.data.results;
        } else if (response?.results && Array.isArray(response.results)) {
          // Alternative format if data is directly paginated
          products = response.results;
        } else if (Array.isArray(response?.data)) {
          // If data is directly an array (non-paginated)
          products = response.data;
        } else if (Array.isArray(response)) {
          // Fallback: if response is directly an array
          products = response;
        }
        
        // Sort products: active first, then by date (newest first)
        const sortedProducts = [...products].sort((a, b) => {
          // First sort by active status (active first)
          if (a.is_active !== b.is_active) {
            return b.is_active ? 1 : -1; // true comes before false
          }
          
          // Then sort by date (newest first)
          const aDate = new Date(a.created_at || 0);
          const bDate = new Date(b.created_at || 0);
          return bDate - aDate;
        });
        
        // Show all products from database (including seller's own products)
        setAllProducts(sortedProducts);
        
        if (products.length === 0) {
          toast('No products available', { duration: 2000, icon: 'ℹ️' });
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setAllProducts([]);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch products';
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [getCached]);

  // Optimized search with Trie and caching - ensure products is always an array
  const productsArray = useMemo(() => Array.isArray(allProducts) ? allProducts : [], [allProducts]);
  const { searchQuery, setSearchQuery, searchResults } = useOptimizedSearch(productsArray);

  // Apply filters with memoization and hash maps
  const filteredProducts = useFilter(Array.isArray(searchResults) ? searchResults : [], filterCriteria);

  // Memoized product list to prevent unnecessary re-renders
  const displayProducts = useMemo(() => {
    const filtered = Array.isArray(filteredProducts) ? filteredProducts : [];
    return filtered;
  }, [filteredProducts]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text mb-4">
            Fresh Produce Marketplace
          </h1>
          <p className="text-lg font-body text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover fresh, locally-grown produce directly from farmers across Bangladesh
          </p>
        </motion.div>

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mb-8 space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-modern pl-12 w-full"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all ${
                showFilters || Object.keys(filterCriteria).some(key => {
                  if (key === 'category') return filterCriteria[key] !== 'all';
                  if (key === 'sortBy') return filterCriteria[key] !== undefined;
                  return filterCriteria[key] !== undefined;
                })
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Category
                    </label>
                    <select
                      value={filterCriteria.category || 'all'}
                      onChange={(e) => setFilterCriteria({ ...filterCriteria, category: e.target.value })}
                      className="input-modern"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Min Price
                    </label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterCriteria.minPrice || ''}
                      onChange={(e) => setFilterCriteria({
                        ...filterCriteria,
                        minPrice: e.target.value ? parseInt(e.target.value) : undefined,
                      })}
                      className="input-modern"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Max Price
                    </label>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterCriteria.maxPrice || ''}
                      onChange={(e) => setFilterCriteria({
                        ...filterCriteria,
                        maxPrice: e.target.value ? parseInt(e.target.value) : undefined,
                      })}
                      className="input-modern"
                      min={0}
                    />
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filterCriteria.sortBy || ''}
                      onChange={(e) => setFilterCriteria({
                        ...filterCriteria,
                        sortBy: e.target.value || undefined,
                      })}
                      className="input-modern"
                    >
                      <option value="">Default</option>
                      <option value="price">Price</option>
                      <option value="name">Name</option>
                      <option value="rating">Rating</option>
                      <option value="stock">Stock</option>
                    </select>
                    {filterCriteria.sortBy && (
                      <button
                        onClick={() => setFilterCriteria({
                          ...filterCriteria,
                          sortOrder: filterCriteria.sortOrder === 'asc' ? 'desc' : 'asc',
                        })}
                        className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {filterCriteria.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Clear Filters */}
                {(filterCriteria.category !== 'all' || 
                  filterCriteria.minPrice !== undefined || 
                  filterCriteria.maxPrice !== undefined ||
                  filterCriteria.sortBy !== undefined) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setFilterCriteria({
                        category: 'all',
                        minPrice: undefined,
                        maxPrice: undefined,
                        inStock: undefined,
                        sortBy: undefined,
                        sortOrder: 'asc',
                      })}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Clear All Filters</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Showing <span className="font-bold text-primary-600 dark:text-primary-400">{displayProducts.length}</span> of <span className="font-bold">{allProducts.length}</span> products
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Products Grid/List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
          </div>
        ) : displayProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 glass rounded-3xl"
          >
            <p className="text-xl text-gray-600 dark:text-gray-400 font-display font-semibold">
              No products found
            </p>
            <p className="text-gray-500 dark:text-gray-500 mt-2 font-body">
              {searchQuery 
                ? `No results for "${searchQuery}". Try a different search term.`
                : 'Try adjusting your filters'}
            </p>
            {(searchQuery || filterCriteria.category !== 'all' || filterCriteria.minPrice !== undefined) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCriteria({
                    category: 'all',
                    minPrice: undefined,
                    maxPrice: undefined,
                    inStock: undefined,
                    sortBy: undefined,
                    sortOrder: 'asc',
                  });
                }}
                className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-semibold"
              >
                Clear All
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {displayProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        )}

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 glass rounded-3xl p-8 bg-gradient-to-r from-primary-500/10 to-accent-500/10"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold gradient-text">{displayProducts.length}+</p>
              <p className="text-gray-600 dark:text-gray-300">Fresh Products</p>
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">50+</p>
              <p className="text-gray-600 dark:text-gray-300">Verified Farmers</p>
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">1000+</p>
              <p className="text-gray-600 dark:text-gray-300">Happy Customers</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MarketplacePage;
