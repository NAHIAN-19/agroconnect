import { create } from 'zustand';
import api from '../api';

const useWishlistStore = create((set, get) => ({
  wishlist: [],
  loading: false,
  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/api/v1/wishlist/');
      set({ wishlist: response.data.data, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },
  addToWishlist: async (productId) => {
    try {
      await api.post('/api/v1/wishlist/add/', { product_id: productId });
      set((state) => ({
        wishlist: [...state.wishlist, { product: { id: productId } }],
      }));
    } catch (error) {
      // Handle error
    }
  },
  removeFromWishlist: async (productId) => {
    try {
      await api.delete('/api/v1/wishlist/remove/', {
        data: { product_id: productId },
      });
      set((state) => ({
        wishlist: state.wishlist.filter(
          (item) => item.product.id !== productId
        ),
      }));
    } catch (error) {
      // Handle error
    }
  },
  isInWishlist: (productId) => {
    return get().wishlist.some((item) => item.product.id === productId);
  },
}));

export default useWishlistStore;
