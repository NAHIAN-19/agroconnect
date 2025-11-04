import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, Phone, Sprout, User, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Backend expects password_confirm, so include it in the payload
      const response = await api.post('/api/v1/register/', data);
      if (response.status === 201 || response.data?.status === 'success') {
        toast.success('Account created! Please check your email for OTP.');
        navigate('/verify-otp', { state: { email: data.email } });
      }
    } catch (error) {
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat().join(', ');
        toast.error(error.response.data.message || `Validation failed: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || error.response?.data?.detail || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-amber-50 to-green-100 dark:from-gray-900 dark:via-green-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl"
      >
        <div className="glass-strong rounded-3xl p-6 md:p-10 lg:p-12 shadow-floating">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-farm rounded-full mb-4"
            >
              <Sprout className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">
              Create Your Account
            </h1>
            <p className="text-body text-gray-600 dark:text-gray-300">
              Join AgroConnect and connect with local farmers
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email - Full Width */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input-modern pl-12"
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Name Fields - Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    {...register('first_name', { required: 'First name is required' })}
                    className="input-modern pl-12"
                    placeholder="John"
                  />
                </div>
                {errors.first_name && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Last Name <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    {...register('last_name')}
                    className="input-modern pl-12"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number - Full Width */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  {...register('phone_number', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                      message: 'Invalid phone number',
                    },
                  })}
                  className="input-modern pl-12"
                  placeholder="+880 1234 567890"
                />
              </div>
              {errors.phone_number && (
                <p className="text-red-500 text-xs mt-1.5">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Password Fields - Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Min. 8 characters',
                      },
                    })}
                    className="input-modern pl-12"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    {...register('password_confirm', {
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === password || 'Passwords do not match',
                    })}
                    className="input-modern pl-12"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password_confirm && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.password_confirm.message}</p>
                )}
              </div>
            </div>

            {/* Register Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="btn-primary w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-6"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </motion.button>

            {/* Login Link */}
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center space-x-1 group transition-colors"
              >
                <span>Already have an account?</span>
                <span className="text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;

