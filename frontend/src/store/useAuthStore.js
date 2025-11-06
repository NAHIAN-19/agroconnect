import { create } from 'zustand';
import api from '../api';

const useAuthStore = create((set, get) => ({
  access_token: localStorage.getItem('access_token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuth: !!localStorage.getItem('access_token'),

  login: (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ access_token: token, user, isAuth: true });
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Fetch wishlist after login
    const useWishlistStore = require('./useWishlistStore').default;
    useWishlistStore.getState().fetchWishlist();
  },

  logout: async () => {
    try {
      // 1. Tell the server to delete the HttpOnly cookie
      // We don't care about the response, just that it completes.
      await api.post('/api/v1/auth/logout/');
      
    } catch (error) {
      // Log the error but don't stop the logout process
      console.error('Server logout failed. Proceeding with local logout.', error);
    } finally {
      // 2. Clear local state (this runs even if the API call fails)
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      set({ access_token: null, user: null, isAuth: false });
      delete api.defaults.headers.common['Authorization'];
    }
  },

  setToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ access_token: token, isAuth: true });
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  initialize: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    let user = null;
    
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      localStorage.removeItem('user');
    }

    if (token && user) {
      set({ access_token: token, user, isAuth: true });
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      set({ access_token: null, user: null, isAuth: false });
      delete api.defaults.headers.common['Authorization'];
    }
  },
}));

export default useAuthStore;
