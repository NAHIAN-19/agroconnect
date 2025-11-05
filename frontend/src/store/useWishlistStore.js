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
      const response = await api.post('/api/v1/wishlist/', { product: productId });
      // After adding, fetch the whole wishlist to get the proper item with its own id
      get().fetchWishlist();
    } catch (error) {
      // Handle error
    }
  },
  removeFromWishlist: async (productId) => {
    try {
        const wishlistItem = get().wishlist.find(item => item.product.id === productId);
        if (wishlistItem) {
            await api.delete(`/api/v1/wishlist/${wishlistItem.id}/`);
            set((state) => ({
                wishlist: state.wishlist.filter(
                (item) => item.product.id !== productId
                ),
            }));
        }
    } catch (error) {
      // Handle error
    }
  },
  isInWishlist: (productId) => {
    return get().wishlist.some((item) => item.product.id === productId);
  },
}));

export default useWishlistStore;
