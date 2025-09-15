import React, { createContext, useContext, useEffect, useState } from 'react';
import { CookieManager } from '@/lib/cookies';
import { supabase } from '@/integrations/supabase/client';

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

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem, openCart?: () => void) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
  isInCart: (itemId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Fonction pour vérifier le consentement aux cookies
  const getConsentStatus = (): boolean | null => {
    const consent = CookieManager.get('bic-consent');
    return consent === null ? null : consent === 'true';
  };

  // Load cart from localStorage/cookies on mount
  useEffect(() => {
    const consent = getConsentStatus();
    if (consent === false) return; // Ne pas charger si consentement refusé
    
    // Essayer de charger depuis localStorage d'abord (plus rapide)
    try {
      const savedCart = localStorage.getItem('bic-cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        // Valider le panier côté serveur
        validateCartItems(parsedCart);
        return;
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
    
    // Fallback vers les cookies si localStorage échoue
    try {
      const cartCookie = CookieManager.get('bic-cart');
      if (cartCookie) {
        const parsedCart = JSON.parse(cartCookie);
        validateCartItems(parsedCart);
      }
    } catch (error) {
      console.error('Error loading cart from cookies:', error);
    }
  }, []);

  // Valider les items du panier côté serveur
  const validateCartItems = async (items: CartItem[]) => {
    if (!items.length) {
      setCartItems([]);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('secure-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate-cart',
          items
        })
      });

      if (error) {
        console.error('Erreur de validation du panier:', error);
        setCartItems(items); // Fallback sur les items originaux
        return;
      }

      if (data?.validatedItems) {
        setCartItems(data.validatedItems);
        if (data.validatedItems.length !== items.length) {
          console.warn('Certains articles du panier ont été supprimés car ils ne sont plus disponibles');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la validation du panier:', error);
      setCartItems(items); // Fallback en cas d'erreur
    }
  };

  // Persist cart to localStorage/cookies whenever it changes
  useEffect(() => {
    const consent = getConsentStatus();
    if (consent === false) return; // Ne pas sauvegarder si consentement refusé
    
    const cartData = JSON.stringify(cartItems);
    
    // Sauvegarder dans localStorage (priorité)
    try {
      localStorage.setItem('bic-cart', cartData);
    } catch (error) {
      console.warn('localStorage unavailable, using cookies:', error);
      // Fallback vers les cookies si localStorage n'est pas disponible
      CookieManager.set('bic-cart', cartData, {
        maxAge: 7 * 24 * 60 * 60, // 7 jours
        sameSite: 'lax'
      });
    }
  }, [cartItems]);

  const addToCart = async (item: CartItem, openCart?: () => void) => {
    // Vérifier que l'item existe et récupérer le prix officiel
    try {
      const { data } = await supabase.functions.invoke('secure-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate-cart',
          items: [item]
        })
      });

      if (data?.validatedItems && data.validatedItems.length > 0) {
        const validatedItem = data.validatedItems[0];
        setCartItems(prev => {
          const exists = prev.some(ci => ci.id === validatedItem.id);
          if (exists) return prev;
          return [...prev, validatedItem];
        });
        if (openCart) setTimeout(() => openCart(), 100);
      } else {
        console.warn('Article non disponible ou prix modifié');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      // Fallback: ajouter l'item tel quel (mode dégradé)
      setCartItems(prev => {
        const exists = prev.some(ci => ci.id === item.id);
        if (exists) return prev;
        return [...prev, item];
      });
      if (openCart) setTimeout(() => openCart(), 100);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => setCartItems([]);

  const getTotalPrice = () => cartItems.reduce((t, i) => t + i.price, 0);
  const getItemCount = () => cartItems.length;
  const isInCart = (itemId: string) => cartItems.some(i => i.id === itemId);

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getItemCount,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};