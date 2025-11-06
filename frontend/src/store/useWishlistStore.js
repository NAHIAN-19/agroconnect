import { create } from 'zustand';
import api from '../api';

const useWishlistStore = create((set, get) => ({
  wishlist: [],
  loading: false,
  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/api/v1/wishlist/');
      // Ensure data is an array, even if API response is nested
      const wishlistData = response.data?.data || response.data || [];
      set({ wishlist: Array.isArray(wishlistData) ? wishlistData : [], loading: false });
    } catch (error) {
      set({ loading: false, wishlist: [] });
    }
  },
  addToWishlist: async (productId) => {
    try {
      const response = await api.post('/api/v1/wishlist/', { product_id: productId });
      
      // After adding, fetch the whole wishlist to get the proper item with its own id
      get().fetchWishlist();
    } catch (error) {
      // Handle error (e.g., "already in wishlist")
      console.error("Error adding to wishlist:", error.response?.data);
      // Re-throw so the component can handle it (e.g., stop loading)
      throw error; 
    }
  },
  removeFromWishlist: async (productId) => {
    try {
        // This logic is correct.
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
      console.error("Error removing from wishlist:", error.response?.data);
      throw error;
    }
  },
  isInWishlist: (productId) => {
    // This is also correct.
    return get().wishlist.some((item) => item.product?.id === productId);
  },
  
  clearWishlist: () => {
    set({ wishlist: [], loading: false });
  },
}));

//useAuthStore.getState().initialize();

export default useWishlistStore;
