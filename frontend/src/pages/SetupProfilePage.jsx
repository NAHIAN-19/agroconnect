import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sprout, ShoppingCart, UserCheck, ArrowLeft, Store, MapPin, CreditCard, Image as ImageIcon, Upload, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import useAuthStore from '../store/useAuthStore';
import { uploadImage } from '../utils/cloudinary';

const SetupProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const profileImageInputRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  useEffect(() => {
    // If user already has a role and profile is completed, redirect
    if (user && user.is_profile_completed) {
      if (user.role === 'SELLER') {
        navigate('/dashboard');
      } else if (user.role === 'BUYER') {
        navigate('/market');
      } else {
        navigate('/market');
      }
    }
  }, [user, navigate]);

  const onSubmit = async (data) => {
    if (!role) {
      toast.error('Please select a role first');
      return;
    }

    setLoading(true);
    try {
      // Prepare payload based on role
      const payload = {
        role: role.toUpperCase(), // SELLER or BUYER
      };

      if (role === 'SELLER') {
        payload.seller_profile = {
          store_name: data.store_name,
          pickup_address: data.pickup_address,
          nid_number: data.nid_number,
          picture: uploadedImageUrl || '',
        };
        //payload.buyer_profile = {};
      } else if (role === 'BUYER') {
        payload.buyer_profile = {
          business_name: data.business_name,
          delivery_address: data.delivery_address,
          nid_number: data.nid_number,
          picture: uploadedImageUrl || '',
        };
        //payload.seller_profile = {};
      }

      // The backend endpoint for completing profile setup
      // This should match your backend API endpoint
      const response = await api.post('/api/v1/onboarding/', payload);
      
      if (response.status === 200 || response.status === 201) {
        // Update user data from response or fetch fresh user data
        if (response.data?.data?.user) {
          setUser(response.data.data.user);
        } else {
          // Fallback: fetch user data
          try {
            const userResponse = await api.get('/api/v1/user/');
            if (userResponse.data) {
              setUser(userResponse.data);
            }
          } catch (err) {
            console.error('Failed to fetch user data:', err);
          }
        }
        
        toast.success('Profile submitted! Waiting for admin verification.');
        
        // Redirect to appropriate page based on role
        if (role === 'SELLER') {
          navigate('/dashboard');
        } else {
          navigate('/market');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Profile setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-amber-50 to-green-100 dark:from-gray-900 dark:via-green-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Choose Your Role
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Select how you want to use AgroConnect
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Seller Card - Agriculture Theme */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRole('SELLER')}
              className="glass rounded-3xl p-8 cursor-pointer card-hover group relative overflow-hidden"
            >
              {/* Agriculture pattern overlay */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.3)_1px,transparent_1px)] bg-[length:40px_40px]" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-full mb-6 group-hover:shadow-2xl transition-all">
                  <Sprout className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  I'm a Seller
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Sell your fresh produce directly to buyers. Manage your inventory and grow your business.
                </p>
                <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                  Start Selling
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Buyer Card - Restaurant Theme */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRole('BUYER')}
              className="glass rounded-3xl p-8 cursor-pointer card-hover group relative overflow-hidden"
            >
              {/* Restaurant pattern overlay */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(251,146,60,0.3)_25%,rgba(251,146,60,0.3)_50%,transparent_50%,transparent_75%,rgba(251,146,60,0.3)_75%,rgba(251,146,60,0.3))] bg-[length:40px_40px]" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-full mb-6 group-hover:shadow-2xl transition-all">
                  <ShoppingCart className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  I'm a Buyer
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Purchase fresh produce from local sellers. Support local agriculture and get quality products.
                </p>
                <div className="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                  Start Shopping
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  const isSeller = role === 'SELLER';

  // Background images with overlay for better text readability
  const backgroundStyle = isSeller 
    ? {
        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)), url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        backgroundImage: `linear-gradient(rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1)), url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={backgroundStyle}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-strong rounded-3xl p-8 md:p-12 shadow-floating backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-2 border-white/50 dark:border-gray-700/50">
          <button
            onClick={() => setRole(null)}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 ${isSeller ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'} rounded-full mb-4`}>
              <UserCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold gradient-text mb-2">
              Complete Your Profile
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {isSeller 
                ? 'Tell us about your store' 
                : 'Tell us about your business'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {isSeller ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <Store className="w-4 h-4 inline mr-2" />
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('store_name', { required: 'Store name is required' })}
                    className="input-modern"
                    placeholder="Enter your store name"
                  />
                  {errors.store_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.store_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Pickup Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('pickup_address', { required: 'Pickup address is required' })}
                    className="input-modern"
                    rows={3}
                    placeholder="Enter your store address where buyers can pickup"
                  />
                  {errors.pickup_address && (
                    <p className="text-red-500 text-sm mt-1">{errors.pickup_address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    NID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('nid_number', { 
                      required: 'NID number is required',
                      pattern: {
                        value: /^\d{10,17}$/,
                        message: 'Please enter a valid NID number (10-17 digits)',
                      },
                    })}
                    className="input-modern"
                    placeholder="Enter your National ID number"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will be verified by admin before you can start selling
                  </p>
                  {errors.nid_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.nid_number.message}</p>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Profile Preview"
                          className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800 shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (imagePreview.startsWith('blob:')) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImagePreview(null);
                            setUploadedImageUrl(null);
                            if (profileImageInputRef.current) {
                              profileImageInputRef.current.value = '';
                            }
                          }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute bottom-0 right-0 bg-primary-500 text-white rounded-full p-2 shadow-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload profile picture"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const localPreview = URL.createObjectURL(file);
                      setImagePreview(localPreview);
                      setUploadingImage(true);

                      try {
                        const imageUrl = await uploadImage(file, 'agroconnect_profiles');
                        URL.revokeObjectURL(localPreview);
                        setImagePreview(imageUrl);
                        setUploadedImageUrl(imageUrl);
                        toast.success('Image uploaded!');
                      } catch (error) {
                        URL.revokeObjectURL(localPreview);
                        toast.error(error.message || 'Failed to upload image');
                        setImagePreview(null);
                        setUploadedImageUrl(null);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Upload a profile picture (optional)
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <Store className="w-4 h-4 inline mr-2" />
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('business_name', { required: 'Business name is required' })}
                    className="input-modern"
                    placeholder="Enter your business name"
                  />
                  {errors.business_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.business_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('delivery_address', { required: 'Delivery address is required' })}
                    className="input-modern"
                    rows={3}
                    placeholder="Enter your delivery address"
                  />
                  {errors.delivery_address && (
                    <p className="text-red-500 text-sm mt-1">{errors.delivery_address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    NID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('nid_number', { 
                      required: 'NID number is required',
                      pattern: {
                        value: /^\d{10,17}$/,
                        message: 'Please enter a valid NID number (10-17 digits)',
                      },
                    })}
                    className="input-modern"
                    placeholder="Enter your National ID number"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will be verified by admin before you can start purchasing
                  </p>
                  {errors.nid_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.nid_number.message}</p>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Profile Preview"
                          className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800 shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (imagePreview.startsWith('blob:')) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImagePreview(null);
                            setUploadedImageUrl(null);
                            if (profileImageInputRef.current) {
                              profileImageInputRef.current.value = '';
                            }
                          }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute bottom-0 right-0 bg-primary-500 text-white rounded-full p-2 shadow-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload profile picture"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const localPreview = URL.createObjectURL(file);
                      setImagePreview(localPreview);
                      setUploadingImage(true);

                      try {
                        const imageUrl = await uploadImage(file, 'agroconnect_profiles');
                        URL.revokeObjectURL(localPreview);
                        setImagePreview(imageUrl);
                        setUploadedImageUrl(imageUrl);
                        toast.success('Image uploaded!');
                      } catch (error) {
                        URL.revokeObjectURL(localPreview);
                        toast.error(error.message || 'Failed to upload image');
                        setImagePreview(null);
                        setUploadedImageUrl(null);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Upload a profile picture (optional)
                  </p>
                </div>
              </>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </motion.button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Your profile will be reviewed by our admin team. 
              You'll receive a notification once your account is verified. 
              This usually takes 24-48 hours.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupProfilePage;
