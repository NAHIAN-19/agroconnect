import { motion } from 'framer-motion';
import { CheckCircle, Mail, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/useAuthStore';

const VerifyOTPPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only process if pasted data contains digits
    if (!/^\d+$/.test(pastedData)) return;
    
    // Take first 6 digits
    const digits = pastedData.slice(0, 6).split('');
    const newOtp = [...otp];
    
    digits.forEach((digit, idx) => {
      if (idx < 6) {
        newOtp[idx] = digit;
      }
    });
    
    setOtp(newOtp);
    
    // Focus the last filled input or the next empty one
    const lastFilledIndex = Math.min(digits.length - 1, 5);
    const nextEmptyIndex = Math.min(digits.length, 5);
    const focusIndex = digits.length >= 6 ? 5 : nextEmptyIndex;
    
    setTimeout(() => {
      const input = document.getElementById(`otp-${focusIndex}`);
      if (input) input.focus();
      
      // Auto-submit if all 6 digits are filled
      if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
        handleSubmit(newOtp.join(''));
      }
    }, 0);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error('Email not found. Please register again.');
      navigate('/register');
      return;
    }

    setResending(true);
    try {
      const response = await api.post('/api/v1/resend-otp/', { email });
      if (response.status === 200) {
        toast.success('OTP sent to your email!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (otpValue = null) => {
    const otpCode = otpValue || otp.join('');
    
    if (otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/v1/verify-otp/', {
        email,
        code: otpCode,
      });
      
      // Handle response structure: {status, status_code, message, data{access_token, user{...}}}
      const responseData = response.data;
      
      if (response.status === 200 && (responseData.status === 'success' || responseData.data)) {
        // Extract data from response
        const data = responseData.data || responseData;
        const { access_token, user } = data;
        
        if (access_token && user) {
          login(access_token, user);
          toast.success('Email verified successfully!');

          // Check if profile is completed
          if (user.is_profile_completed) {
            // Redirect based on role
            if (user.role === 'SELLER') {
              navigate('/dashboard');
            } else if (user.role === 'BUYER') {
              navigate('/market');
            } else {
              navigate('/market');
            }
          } else {
            // Profile not completed, go to role selection
            navigate('/setup-profile');
          }
        } else {
          toast.error('Invalid response format from server');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      const firstInput = document.getElementById('otp-0');
      if (firstInput) firstInput.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-amber-50 to-green-100 dark:from-gray-900 dark:via-green-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl p-8 md:p-12 shadow-floating">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-farm rounded-full mb-4"
            >
              <Mail className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              Verify Email
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Enter the 6-digit code sent to
            </p>
            <p className="text-primary-600 dark:text-primary-400 font-semibold mt-1">
              {email}
            </p>
          </div>

          {/* OTP Input */}
          <div className="space-y-6">
            <div 
              className="flex justify-center gap-3"
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all"
                  disabled={loading}
                />
              ))}
            </div>

            <motion.button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || otp.join('').length !== 6}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Verify Email</span>
                </>
              )}
            </motion.button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium inline-flex items-center space-x-2 disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : "Didn't receive code? Resend"}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTPPage;

