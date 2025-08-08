import { useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  cover_image_url?: string;
  description?: string;
  period?: string;
  zone?: string;
  pages?: number;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('bic-cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bic-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem, openCart?: () => void) => {
    setCartItems(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(cartItem => cartItem.id === item.id);
      if (existingIndex >= 0) {
        // Item already in cart, don't add duplicate
        return prev;
      }
      return [...prev, item];
    });
    
    // Open cart sidebar if callback provided
    if (openCart) {
      setTimeout(() => openCart(), 100);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  const getItemCount = () => {
    return cartItems.length;
  };

  const isInCart = (itemId: string) => {
    return cartItems.some(item => item.id === itemId);
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getItemCount,
    isInCart,
  };
};