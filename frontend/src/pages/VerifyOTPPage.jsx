import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '../components/LoadingButton';

const VerifyOTPPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const onSubmit = async (formData) => {
    setLoading(true);
    const email = location.state?.email || formData.email;
    try {
      const { data } = await api.post('/auth/verify-otp/', { ...formData, email });
      const { access_token, user } = data.data;
      login(access_token, user);
      toast.success(data.message);
      navigate('/setup-profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Verify OTP
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
          {!location.state?.email && (
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              {...register('email', { required: 'Email is required' })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            name="otp"
            label="OTP"
            id="otp"
            {...register('otp', { required: 'OTP is required' })}
            error={!!errors.otp}
            helperText={errors.otp?.message}
          />
          <LoadingButton
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            loading={loading}
          >
            Verify
          </LoadingButton>
        </Box>
      </Box>
    </Container>
  );
};

export default VerifyOTPPage;
