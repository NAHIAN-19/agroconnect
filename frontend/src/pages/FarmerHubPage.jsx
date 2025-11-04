import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { demoOrders, demoFarmerProducts, formatCurrency, formatDate } from '../data/demoData';
import useAuthStore from '../store/useAuthStore';

const FarmerHubPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const user = useAuthStore((state) => state.user);
  const isVerified = user?.profile?.verified !== false;

  useEffect(() => {
    if (activeTab === 0) {
      fetchOrders();
    } else {
      fetchProducts();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (import.meta.env.VITE_USE_DEMO === 'true' || !import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setOrders(demoOrders);
        setLoading(false);
        return;
      }
      const response = await api.get('/api/farmer-orders/');
      setOrders(response.data);
    } catch (error) {
      setOrders(demoOrders);
      toast.error('Using demo data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (import.meta.env.VITE_USE_DEMO === 'true' || !import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setProducts(demoFarmerProducts);
        setLoading(false);
        return;
      }
      const response = await api.get('/api/my-products/');
      setProducts(response.data);
    } catch (error) {
      setProducts(demoFarmerProducts);
      toast.error('Using demo data');
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async (orderId) => {
    try {
      if (import.meta.env.VITE_USE_DEMO === 'true' || !import.meta.env.VITE_API_BASE_URL) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
        toast.success('Order marked as shipped!');
        return;
      }
      await api.post(`/api/farmer-orders/${orderId}/ship/`);
      toast.success('Order shipped!');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      if (import.meta.env.VITE_USE_DEMO === 'true' || !import.meta.env.VITE_API_BASE_URL) {
        setProducts(products.filter(p => p.id !== productId));
        toast.success('Product deleted!');
        return;
      }
      await api.delete(`/api/my-products/${productId}/`);
      toast.success('Product deleted!');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (import.meta.env.VITE_USE_DEMO === 'true' || !import.meta.env.VITE_API_BASE_URL) {
        if (editingProduct) {
          setProducts(products.map(p => p.id === editingProduct.id ? { ...productData, id: editingProduct.id } : p));
          toast.success('Product updated!');
        } else {
          setProducts([...products, { ...productData, id: products.length + 1 }]);
          toast.success('Product added!');
        }
        setShowProductModal(false);
        setEditingProduct(null);
        return;
      }

      if (editingProduct) {
        await api.patch(`/api/my-products/${editingProduct.id}/`, productData);
        toast.success('Product updated!');
      } else {
        await api.post('/api/my-products/', productData);
        toast.success('Product added!');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-12 max-w-md text-center"
        >
          <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold gradient-text mb-4">Account Pending Verification</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your account is pending admin verification. You'll be able to access the dashboard once verified.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This usually takes 24-48 hours.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
            Farmer Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your orders and products
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="glass rounded-2xl p-2 mb-8 flex space-x-2">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeTab === 0
                ? 'bg-gradient-farm text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Orders ({orders.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeTab === 1
                ? 'bg-gradient-farm text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Package className="w-5 h-5" />
              <span>My Products ({products.length})</span>
            </div>
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400">No orders yet</p>
              </div>
            ) : (
              orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass rounded-2xl p-6 hover:shadow-floating transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                          {order.product_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        Buyer: {order.buyer_name || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        Quantity: {order.quantity} {order.unit || 'units'}
                      </p>
                      <p className="text-lg font-bold gradient-text">
                        {formatCurrency(order.total_price)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Order #{order.order_number} • {formatDate(order.created_at)}
                      </p>
                    </div>
                    {order.status === 'pending' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShip(order.id)}
                        className="btn-primary px-6 py-3"
                      >
                        Confirm & Ship
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Products Tab */}
        {activeTab === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Products</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Product</span>
              </motion.button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">No products yet</p>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="btn-primary"
                >
                  Add Your First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl overflow-hidden card-hover"
                  >
                    <div className="relative h-48 bg-gradient-to-br from-green-100 to-amber-100">
                      <img
                        src={product.image || 'https://via.placeholder.com/400x300'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold gradient-text">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Stock: {product.stock} {product.unit}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowProductModal(true);
                          }}
                          className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    stock: product?.stock || '',
    unit: product?.unit || 'kg',
    category: product?.category || 'Vegetables',
    image: product?.image || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-modern"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-modern"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Price (৳) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input-modern"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Stock *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="input-modern"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-modern"
              >
                <option value="kg">kg</option>
                <option value="piece">piece</option>
                <option value="dozen">dozen</option>
                <option value="bag">bag</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-modern"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Spices">Spices</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Image URL</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="input-modern"
              placeholder="https://example.com/image.jpg"
            />
            {formData.image && (
              <img
                src={formData.image}
                alt="Preview"
                className="mt-2 w-full h-48 object-cover rounded-xl"
              />
            )}
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default FarmerHubPage;
