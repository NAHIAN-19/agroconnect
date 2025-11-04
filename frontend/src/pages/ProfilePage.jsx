import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  Edit2,
  Image as ImageIcon,
  Key,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Upload,
  X,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api';
import useAuthStore from '../store/useAuthStore';
import { uploadImage } from '../utils/cloudinary';
import { uploadImageViaServiceWorker } from '../utils/uploadService';

const ProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasShownVerificationToast, setHasShownVerificationToast] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImageUrl, setUploadingImageUrl] = useState(null); // Track URL being uploaded in background
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const profileImageInputRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // Function to save image URL to backend (called automatically after upload completes)
  const saveImageToBackend = useCallback(async (imageUrl, metadata = {}) => {
    try {
      const currentProfile = profile;
      const currentRole = currentProfile?.role || user?.role;
      const isUserSeller = currentRole === 'SELLER' || currentRole === 'seller';
      const isUserBuyer = currentRole === 'BUYER' || currentRole === 'buyer';
      
      const imagePayload = {
        avatar_url: imageUrl,
      };

      // Add to seller_profile or buyer_profile based on role
      if (isUserSeller) {
        imagePayload.seller_profile = {
          ...(currentProfile?.seller_profile || {}),
          picture: imageUrl,
        };
      } else if (isUserBuyer) {
        imagePayload.buyer_profile = {
          ...(currentProfile?.buyer_profile || {}),
          picture: imageUrl,
        };
      }

      console.log('Auto-saving image URL to backend:', imagePayload);
      const response = await api.patch('/api/v1/profile/my/', imagePayload);
      
      // Handle response
      let updatedProfile = response.data;
      if (updatedProfile?.data) {
        updatedProfile = updatedProfile.data;
      }
      
      // Map profile to seller_profile or buyer_profile
      if (updatedProfile?.profile) {
        if (isUserSeller) {
          updatedProfile.seller_profile = updatedProfile.profile;
        } else if (isUserBuyer) {
          updatedProfile.buyer_profile = updatedProfile.profile;
        }
        delete updatedProfile.profile;
      }
      
      // Update local state
      setProfile((prev) => ({
        ...prev,
        avatar_url: imageUrl,
        ...(isUserSeller && prev?.seller_profile ? { seller_profile: { ...prev.seller_profile, picture: imageUrl } } : {}),
        ...(isUserBuyer && prev?.buyer_profile ? { buyer_profile: { ...prev.buyer_profile, picture: imageUrl } } : {}),
      }));
      
      // Update user in store with fresh data from backend response
      const updatedUserData = {
        ...user,
        avatar_url: imageUrl,
        ...(updatedProfile.avatar_url ? { avatar_url: updatedProfile.avatar_url } : {}),
      };
      setUser(updatedUserData);
      setUploadingImageUrl(null); // Clear upload tracking
      
      // Show subtle notification
      toast.success('Picture updated!', { duration: 2000 });
    } catch (error) {
      console.error('Error saving image URL:', error);
      toast.error('Image uploaded but failed to save. Please try again.');
      setUploadingImageUrl(null);
    }
  }, [profile, user]);

  useEffect(() => {
    fetchProfile();
    // Check localStorage to see if we've shown verification toast before
    const hasShownToast = localStorage.getItem('has_shown_verification_toast') === 'true';
    if (hasShownToast) {
      setHasShownVerificationToast(true);
    }
  }, []);

  // Listen for upload completion messages from Service Worker (handles resume after refresh)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = async (event) => {
      if (event.data.type === 'UPLOAD_COMPLETE') {
        const { uploadId, imageUrl, error, success, metadata } = event.data;
        
        if (success && imageUrl) {
          // Upload completed, save to backend
          console.log('Upload completed via Service Worker:', imageUrl);
          
          // Update preview if we have the image URL
          setImagePreview(imageUrl);
          setUploadingImageUrl(imageUrl);
          setUploadingImage(false);
          
          // Save to backend
          await saveImageToBackend(imageUrl, metadata);
        } else {
          console.error('Upload failed via Service Worker:', error);
          toast.error(error || 'Upload failed');
          setUploadingImage(false);
          setImagePreview(profile?.avatar_url || null);
          setUploadingImageUrl(null);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [profile, saveImageToBackend]);

  const fetchProfile = async () => {
    setLoading(true);
    
    // Always fetch from backend API
    try {
      console.log('Fetching profile from backend:', '/api/v1/profile/my/');
      const response = await api.get('/api/v1/profile/my/');
      console.log('Profile API response:', response.data);
      
      // Handle different response structures
      let userData = response.data;
      
      // Check for nested data (API returns {status, message, data: {...}})
      if (userData?.data) {
        userData = userData.data;
      } else if (userData?.user_data) {
        userData = userData.user_data;
      } else if (userData?.profile) {
        userData = userData.profile;
      } else if (userData?.user) {
        userData = userData.user;
      }
      
      // If userData is still the whole response, use it directly
      if (userData && typeof userData === 'object') {
        // Map full_name to first_name/last_name if needed
        if (userData.full_name && !userData.first_name) {
          const nameParts = userData.full_name.split(' ');
          userData.first_name = nameParts[0] || '';
          userData.last_name = nameParts.slice(1).join(' ') || '';
        }
        
        // Map profile to seller_profile or buyer_profile based on role
        // API returns data.profile, but we need data.seller_profile or data.buyer_profile
        if (userData.profile) {
          if (userData.role === 'SELLER' || userData.role === 'seller') {
            userData.seller_profile = userData.profile;
          } else if (userData.role === 'BUYER' || userData.role === 'buyer') {
            userData.buyer_profile = userData.profile;
          }
          // Remove the generic profile field after mapping
          delete userData.profile;
        }
        
        // Ensure seller_profile and buyer_profile exist as objects if role is set (for when profile doesn't exist yet)
        if (userData.role === 'SELLER' || userData.role === 'seller') {
          userData.seller_profile = userData.seller_profile || {};
        }
        if (userData.role === 'BUYER' || userData.role === 'buyer') {
          userData.buyer_profile = userData.buyer_profile || {};
        }
        
        console.log('Setting profile data:', userData);
        setProfile(userData);
        reset(userData);
        
        // Update auth store with profile data (ensure avatar_url is included)
        const updatedUserStore = {
          ...user,
          ...userData,
          avatar_url: userData.avatar_url || user?.avatar_url || null,
        };
        setUser(updatedUserStore);
        
        // Check if verification status changed and show toast once
        const wasVerified = user?.is_admin_verified;
        const isNowVerified = userData.is_admin_verified;
        const hasShownToast = localStorage.getItem('has_shown_verification_toast') === 'true';
        
        if (isNowVerified && !wasVerified && !hasShownToast && !hasShownVerificationToast) {
          toast.success('Account Verified! Your account has been verified by an administrator.');
          setHasShownVerificationToast(true);
          localStorage.setItem('has_shown_verification_toast', 'true');
        }
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Show error and set profile to null so user sees error state
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message || 'Failed to fetch profile';
      toast.error(errorMsg);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setChangingPassword(true);

    // Validation
    const errors = {};
    if (!passwordFormData.old_password) {
      errors.old_password = 'Current password is required';
    }
    if (!passwordFormData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordFormData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }
    if (!passwordFormData.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    if (passwordFormData.old_password === passwordFormData.new_password) {
      errors.new_password = 'New password must be different from current password';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      setChangingPassword(false);
      return;
    }

    try {
      const payload = {
        old_password: passwordFormData.old_password,
        new_password: passwordFormData.new_password,
        confirm_password: passwordFormData.confirm_password,
      };

      console.log('Changing password:', '/api/v1/password/change/');
      const response = await api.patch('/api/v1/password/change/', payload);
      console.log('Password change response:', response.data);

      toast.success('Password changed successfully!');
      
      // Reset form and hide
      setPasswordFormData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordErrors({});
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Error changing password:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle validation errors from backend
      if (error.response?.data) {
        const backendErrors = error.response.data;
        const newErrors = {};
        
        if (backendErrors.old_password) {
          newErrors.old_password = Array.isArray(backendErrors.old_password) 
            ? backendErrors.old_password[0] 
            : backendErrors.old_password;
        }
        if (backendErrors.new_password) {
          newErrors.new_password = Array.isArray(backendErrors.new_password) 
            ? backendErrors.new_password[0] 
            : backendErrors.new_password;
        }
        if (backendErrors.confirm_password) {
          newErrors.confirm_password = Array.isArray(backendErrors.confirm_password) 
            ? backendErrors.confirm_password[0] 
            : backendErrors.confirm_password;
        }
        if (backendErrors.non_field_errors) {
          newErrors.non_field_errors = Array.isArray(backendErrors.non_field_errors) 
            ? backendErrors.non_field_errors[0] 
            : backendErrors.non_field_errors;
        }

        if (Object.keys(newErrors).length > 0) {
          setPasswordErrors(newErrors);
        } else {
          const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message || 'Failed to change password';
          toast.error(errorMsg);
        }
      } else {
        const errorMsg = error.message || 'Failed to change password';
        toast.error(errorMsg);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Prepare the payload structure for backend
      // NOTE: Don't include image URLs here - they're saved automatically when upload completes
      const payload = { ...data };
      
      // Structure seller_profile data properly (without picture - that's handled separately)
      if (isSeller) {
        payload.seller_profile = {
          ...(profile.seller_profile || {}),
          ...(data.seller_profile || {}),
        };
        // Don't include picture in this save - it will be saved when upload completes
        if (payload.seller_profile.picture && !uploadingImageUrl) {
          // Only include if it's an already uploaded URL (not a new upload)
          delete payload.seller_profile.picture;
        }
      }
      
      // Structure buyer_profile data properly (without picture)
      if (isBuyer) {
        payload.buyer_profile = {
          ...(profile.buyer_profile || {}),
          ...(data.buyer_profile || {}),
        };
        // Don't include picture in this save - it will be saved when upload completes
        if (payload.buyer_profile.picture && !uploadingImageUrl) {
          // Only include if it's an already uploaded URL (not a new upload)
          delete payload.buyer_profile.picture;
        }
      }
      
      // Don't include avatar_url if we're currently uploading (it will be saved separately)
      if (uploadingImage || uploadingImageUrl) {
        delete payload.avatar_url;
      }
      
      // Always use backend API for PATCH
      console.log('Updating profile via PATCH (text fields only):', '/api/v1/profile/my/', payload);
      const response = await api.patch('/api/v1/profile/my/', payload);
      console.log('Profile update response:', response.data);
      
      // Handle the new API response structure
      let updatedProfile = response.data;
      
      // Check for nested data (API returns {status, message, data: {...}})
      if (updatedProfile?.data) {
        updatedProfile = updatedProfile.data;
      } else if (updatedProfile?.user_data) {
        updatedProfile = updatedProfile.user_data;
      } else if (updatedProfile?.profile) {
        updatedProfile = updatedProfile.profile;
      } else if (updatedProfile?.user) {
        updatedProfile = updatedProfile.user;
      }
      
      if (updatedProfile && typeof updatedProfile === 'object') {
        // Map full_name if provided
        if (updatedProfile.full_name && !updatedProfile.first_name) {
          const nameParts = updatedProfile.full_name.split(' ');
          updatedProfile.first_name = nameParts[0] || '';
          updatedProfile.last_name = nameParts.slice(1).join(' ') || '';
        }
        
        // Map profile to seller_profile or buyer_profile based on role
        // API returns data.profile, but we need data.seller_profile or data.buyer_profile
        if (updatedProfile.profile) {
          if (updatedProfile.role === 'SELLER' || updatedProfile.role === 'seller') {
            updatedProfile.seller_profile = updatedProfile.profile;
          } else if (updatedProfile.role === 'BUYER' || updatedProfile.role === 'buyer') {
            updatedProfile.buyer_profile = updatedProfile.profile;
          }
          // Remove the generic profile field after mapping
          delete updatedProfile.profile;
        }
        
        // Ensure seller_profile and buyer_profile exist as objects if role is set
        if (updatedProfile.role === 'SELLER' || updatedProfile.role === 'seller') {
          updatedProfile.seller_profile = updatedProfile.seller_profile || {};
        }
        if (updatedProfile.role === 'BUYER' || updatedProfile.role === 'buyer') {
          updatedProfile.buyer_profile = updatedProfile.buyer_profile || {};
        }
        
        setProfile(updatedProfile);
        // Update user store with avatar_url included
        const updatedUserStoreData = {
          ...user,
          ...updatedProfile,
          avatar_url: updatedProfile.avatar_url || user?.avatar_url || null,
        };
        setUser(updatedUserStoreData);
        // Don't clear imagePreview here - it will be cleared when image upload completes
        // Only clear if no upload is in progress
        if (!uploadingImage && !uploadingImageUrl) {
          setImagePreview(null);
        }
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      } else {
        // If response structure is unexpected, refresh from backend
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        setImagePreview(null);
        // Refresh profile from backend
        await fetchProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message || 'Failed to update profile';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Profile not found</p>
        </div>
      </div>
    );
  }

  const isSeller = profile.role === 'SELLER' || profile.role === 'seller';
  const isBuyer = profile.role === 'BUYER' || profile.role === 'buyer';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text mb-2">
            Profile & Settings
          </h1>
          <p className="text-body text-lg text-gray-600 dark:text-gray-300">
            Manage your account information and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">Account Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary flex items-center space-x-2 px-4 py-2"
              >
                <Edit2 className="w-5 h-5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar/Profile Picture Upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {profile.avatar_url || imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview || profile.avatar_url}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800 shadow-lg"
                    />
                    {isEditing && (
                      <button
                        type="button"
                onClick={() => {
                  // Clean up any local preview URL
                  if (imagePreview && imagePreview.startsWith('blob:')) {
                    URL.revokeObjectURL(imagePreview);
                  }
                  setImagePreview(null);
                  setUploadingImageUrl(null);
                  if (profileImageInputRef.current) {
                    profileImageInputRef.current.value = '';
                  }
                }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {isEditing && (
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
                )}
              </div>
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Show preview immediately with local file
                  const localPreview = URL.createObjectURL(file);
                  setImagePreview(localPreview);
                  setUploadingImage(true);

                  // Start background upload via Service Worker (survives page refresh)
                  uploadImageViaServiceWorker(file, 'agroconnect', { profileId: profile?.id })
                    .then((imageUrl) => {
                      // Clean up local preview URL
                      URL.revokeObjectURL(localPreview);
                      
                      // Update preview with actual Cloudinary URL
                      setImagePreview(imageUrl);
                      setUploadingImageUrl(imageUrl);
                      setUploadingImage(false);
                      
                      // Automatically save the image URL to backend (separate PATCH request)
                      saveImageToBackend(imageUrl, { profileId: profile?.id });
                    })
                    .catch((error) => {
                      console.error('Image upload error:', error);
                      // Clean up local preview URL on error
                      URL.revokeObjectURL(localPreview);
                      toast.error(error.message || 'Failed to upload image');
                      setUploadingImage(false);
                      setImagePreview(profile?.avatar_url || null); // Revert to original
                      setUploadingImageUrl(null);
                      if (profileImageInputRef.current) {
                        profileImageInputRef.current.value = '';
                      }
                    });
                }}
              />
              {isEditing && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Click the upload button to change profile picture
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name or First Name */}
              {profile.full_name ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...register('full_name', { required: 'Full name is required' })}
                      className="input-modern"
                      defaultValue={profile.full_name}
                    />
                  ) : (
                    <p className="text-gray-800 dark:text-white py-3">{profile.full_name}</p>
                  )}
                  {errors.full_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('first_name', { required: 'First name is required' })}
                        className="input-modern"
                        defaultValue={profile.first_name || ''}
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white py-3">{profile.first_name || 'Not set'}</p>
                    )}
                    {errors.first_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('last_name')}
                        className="input-modern"
                        defaultValue={profile.last_name || ''}
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white py-3">{profile.last_name || 'Not set'}</p>
                    )}
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <p className="text-gray-800 dark:text-white py-3">{profile.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    {...register('phone_number', {
                      pattern: {
                        value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                        message: 'Invalid phone number',
                      },
                    })}
                    className="input-modern"
                    defaultValue={profile.phone_number || ''}
                  />
                ) : (
                  <p className="text-gray-800 dark:text-white py-3">{profile.phone_number || 'Not set'}</p>
                )}
                {errors.phone_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>
                )}
              </div>
            </div>

            {/* Role-specific Information */}
            {isSeller && (
              <div className="mt-6 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Seller Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Store Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('seller_profile.store_name')}
                        className="input-modern"
                        defaultValue={profile.seller_profile?.store_name || ''}
                        placeholder="Enter store name"
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white">
                        {profile.seller_profile?.store_name || 'Not set'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Pickup Address
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('seller_profile.pickup_address')}
                        className="input-modern"
                        defaultValue={profile.seller_profile?.pickup_address || ''}
                        placeholder="Enter pickup address"
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white">
                        {profile.seller_profile?.pickup_address || 'Not set'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      NID Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('seller_profile.nid_number')}
                        className="input-modern"
                        defaultValue={profile.seller_profile?.nid_number || ''}
                        placeholder="Enter NID number"
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white">
                        {profile.seller_profile?.nid_number || 'Not set'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isBuyer && (
              <div className="mt-6 p-6 bg-accent-50 dark:bg-accent-900/20 rounded-xl">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Buyer Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Business Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('buyer_profile.business_name')}
                        className="input-modern"
                        defaultValue={profile.buyer_profile?.business_name || ''}
                        placeholder="Enter business name"
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white">
                        {profile.buyer_profile?.business_name || 'Not set'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Delivery Address
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('buyer_profile.delivery_address')}
                        className="input-modern"
                        defaultValue={profile.buyer_profile?.delivery_address || ''}
                        placeholder="Enter delivery address"
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white">
                        {profile.buyer_profile?.delivery_address || 'Not set'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      NID Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        {...register('buyer_profile.nid_number')}
                        className="input-modern"
                        defaultValue={profile.buyer_profile?.nid_number || ''}
                        placeholder="Enter NID number"
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-white">
                        {profile.buyer_profile?.nid_number || 'Not set'}
                      </p>
                    )}
                  </div>
                  
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="mt-6 flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center space-x-3">
                {profile.is_admin_verified ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-gray-800 dark:text-white">Account Verified</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-gray-800 dark:text-white">Pending Verification</span>
                  </>
                )}
              </div>
              {profile.is_email_verified && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Email Verified</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                  className="btn-primary flex items-center space-x-2 px-6 py-3"
                >
                  <Save className="w-5 h-5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    // Clean up any local preview URL on cancel
                    if (imagePreview && imagePreview.startsWith('blob:')) {
                      URL.revokeObjectURL(imagePreview);
                    }
                    setIsEditing(false);
                    setImagePreview(null);
                    setUploadingImageUrl(null);
                    reset(profile);
                    if (profileImageInputRef.current) {
                      profileImageInputRef.current.value = '';
                    }
                  }}
                  className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <X className="w-5 h-5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8"
        >
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
            <Key className="w-6 h-6 mr-2" />
            Security
          </h2>
          <div className="space-y-4">
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">Change Password</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
              </div>
              <Key className="w-5 h-5 text-gray-400" />
            </button>

            {/* Password Change Form */}
            {showPasswordChange && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              >
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordErrors.non_field_errors && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{passwordErrors.non_field_errors}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordFormData.old_password}
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, old_password: e.target.value })}
                      className="input-modern"
                      placeholder="Enter current password"
                    />
                    {passwordErrors.old_password && (
                      <p className="text-sm text-red-500 mt-1">{passwordErrors.old_password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordFormData.new_password}
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, new_password: e.target.value })}
                      className="input-modern"
                      placeholder="Enter new password (min 8 characters)"
                    />
                    {passwordErrors.new_password && (
                      <p className="text-sm text-red-500 mt-1">{passwordErrors.new_password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordFormData.confirm_password}
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, confirm_password: e.target.value })}
                      className="input-modern"
                      placeholder="Confirm new password"
                    />
                    {passwordErrors.confirm_password && (
                      <p className="text-sm text-red-500 mt-1">{passwordErrors.confirm_password}</p>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <motion.button
                      type="submit"
                      disabled={changingPassword}
                      whileHover={{ scale: changingPassword ? 1 : 1.02 }}
                      whileTap={{ scale: changingPassword ? 1 : 0.98 }}
                      className="btn-primary flex items-center space-x-2 px-4 py-2"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Changing...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Change Password</span>
                        </>
                      )}
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordFormData({
                          old_password: '',
                          new_password: '',
                          confirm_password: '',
                        });
                        setPasswordErrors({});
                      }}
                      className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <button className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">Privacy Settings</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your privacy preferences</p>
              </div>
              <Shield className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;

