import React, { createContext, useContext } from 'react';
import { CartItem, MenuItem, KitchenSettings } from '../types';
import { initialKitchenSettings } from '../lib/initialData';
import { usePersistentState } from '../lib/usePersistentState';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  grandTotal: number;
  settings: KitchenSettings;
  updateSettings: (newSettings: Partial<KitchenSettings>) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = usePersistentState<CartItem[]>('trippys_cart', []);
  const [settings, setSettings] = usePersistentState<KitchenSettings>('trippys_settings', initialKitchenSettings);

  const addToCart = (menuItem: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.menuItem.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => setCart([]);

  const updateSettings = (newSettings: Partial<KitchenSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const deliveryFee = subtotal >= settings.free_delivery_above || subtotal === 0
    ? 0
    : settings.delivery_charge;

  const taxAmount = Math.round((subtotal * settings.tax_percent) / 100);
  const grandTotal = subtotal + deliveryFee + taxAmount;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        deliveryFee,
        taxAmount,
        grandTotal,
        settings,
        updateSettings
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
