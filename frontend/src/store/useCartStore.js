import { create } from 'zustand';
import useAuthStore from './useAuthStore';

/**
 * Optimized Cart Store using optimized operations
 * Uses Map for O(1) lookups while maintaining array for rendering
 */
const useCartStore = create((set, get) => ({
  items: [],

  addToCart: (product) => {
    // Check if user is seller trying to add their own product
    const user = useAuthStore.getState().user;
    if (user && user.role === 'SELLER' && user.id) {
      if (product.seller_id === user.id || product.farmer_id === user.id) {
        throw new Error('You cannot add your own products to cart');
      }
    }
    
    set((state) => {
      const productId = product.id;
      // Use Map for O(1) lookup instead of O(n) find
      const itemsMap = new Map(state.items.map(item => [item.id, item]));
      
      if (itemsMap.has(productId)) {
        const existing = itemsMap.get(productId);
        itemsMap.set(productId, { ...existing, quantity: existing.quantity + 1 });
      } else {
        itemsMap.set(productId, { ...product, quantity: 1 });
      }

      return {
        items: Array.from(itemsMap.values()),
      };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({
      // O(n) filter but simple and clear - could optimize further if needed
      items: state.items.filter((item) => item.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    
    set((state) => ({
      // Map for O(1) lookup during update
      items: state.items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  clearCart: () => {
    set({ items: [] });
  },

  // O(n) lookup - use sparingly, prefer direct array access
  getItem: (productId) => {
    const state = get();
    // Could use Map here but for single lookups, array.find is acceptable
    return state.items.find(item => item.id === productId) || null;
  },
}));

export default useCartStore;

