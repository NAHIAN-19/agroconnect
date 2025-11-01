import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '../components/LoadingButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

const ProfileSetupPage = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const role = watch('role');

  const onSubmit = async (formData) => {
    setLoading(true);
    const profileData = role === 'FARMER' ? { farmer_profile: formData } : { buyer_profile: formData };
    try {
      await api.post('/profile/setup/', { role, ...profileData });
      const { data } = await api.get('/auth/user/'); // Fetch updated user
      setUser(data);
      toast.success('Profile setup complete!');
      navigate(role === 'FARMER' ? '/dashboard' : '/market');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profile setup failed');
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
          Setup Your Profile
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">I am a...</FormLabel>
            <RadioGroup row name="role" {...register('role', { required: 'Please select a role' })}>
              <FormControlLabel value="FARMER" control={<Radio />} label="Farmer" />
              <FormControlLabel value="BUYER" control={<Radio />} label="Buyer" />
            </RadioGroup>
          </FormControl>

          {role === 'FARMER' && (
            <>
              <TextField margin="normal" required fullWidth label="Farm Name" {...register('farm_name', { required: true })} />
              <TextField margin="normal" required fullWidth label="Pickup Address" {...register('pickup_address', { required: true })} />
              <TextField margin="normal" required fullWidth label="NID Number" {...register('nid_number', { required: true })} />
            </>
          )}

          {role === 'BUYER' && (
            <>
              <TextField margin="normal" required fullWidth label="Business Name" {...register('business_name', { required: true })} />
              <TextField margin="normal" required fullWidth label="Delivery Address" {...register('delivery_address', { required: true })} />
              <TextField margin="normal" required fullWidth label="NID Number" {...register('nid_number', { required: true })} />
            </>
          )}

          <LoadingButton
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            loading={loading}
            disabled={!role}
          >
            Complete Setup
          </LoadingButton>
        </Box>
      </Box>
    </Container>
  );
};

export default ProfileSetupPage;
