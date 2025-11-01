import { create } from 'zustand';
import api from '../api';

const useAuthStore = create((set) => ({
  access_token: null,
  user: null,
  isAuth: false,
  login: (token, userData) => {
    set({ access_token: token, user: userData, isAuth: true });
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  logout: () => {
    set({ access_token: null, user: null, isAuth: false });
    delete api.defaults.headers.common['Authorization'];
  },
  setUser: (userData) => set({ user: userData }),
}));

export default useAuthStore;
