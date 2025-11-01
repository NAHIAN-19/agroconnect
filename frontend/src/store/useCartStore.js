import { create } from 'zustand';
import toast from 'react-hot-toast';

const useCartStore = create((set) => ({
  items: [],
  addToCart: (product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id);
      if (existingItem) {
        toast.error('Item already in cart');
        return { items: state.items };
      }
      toast.success('Item added to cart');
      return { items: [...state.items, { ...product, quantity: 1 }] };
    });
  },
  removeFromCart: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    }));
    toast.success('Item removed from cart');
  },
  clearCart: () => set({ items: [] }),
}));

export default useCartStore;
