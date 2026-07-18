'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { queueOfflineOrder, getOfflineOrders, removeOfflineOrder } from '../utils/indexedDB';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  gstPercent: number;
  discountPercent: number;
  subtotal: number;
}

interface CartContextType {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  couponCode: string | null;
  couponDiscountPercent: number;
  isOnline: boolean;
  addToCart: (product: any) => void;
  adjustQuantity: (productId: string, amount: number, stockLimit?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string, storeId: string) => Promise<boolean>;
  submitCheckout: (customerName?: string, customerEmail?: string) => Promise<any>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, apiFetch } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscountPercent, setCouponDiscountPercent] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // 1. Connection states listener
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const goOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Initial check and load cart
    if (user) {
      const savedCart = localStorage.getItem(`cart_${user.id}`);
      if (savedCart) setCart(JSON.parse(savedCart));
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [user]);

  // Recalculate totals on cart changes or coupon updates
  useEffect(() => {
    let sub = 0;
    let txAmount = 0;
    let discAmount = 0;

    cart.forEach(item => {
      const itemSub = item.price * item.quantity;
      sub += itemSub;
      txAmount += itemSub * (item.gstPercent / 100);
      discAmount += itemSub * (item.discountPercent / 100);
    });

    // Apply Coupon discount
    if (couponDiscountPercent > 0) {
      discAmount += sub * (couponDiscountPercent / 100);
    }

    setSubtotal(sub);
    setTax(txAmount);
    setDiscount(discAmount);
    setTotal(Math.max(0, (sub + txAmount) - discAmount));

    if (user && cart.length > 0) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, couponDiscountPercent, user]);

  const addToCart = (prod: any) => {
    setCart(prev => {
      const exist = prev.find(item => item.productId === prod.id);
      let updated: CartItem[];

      if (exist) {
        if (exist.quantity >= prod.stockQty) {
          alert(`Insufficient stock. Only ${prod.stockQty} items left.`);
          return prev;
        }
        updated = prev.map(item =>
          item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updated = [...prev, {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          price: prod.price,
          quantity: 1,
          imageUrl: prod.imageUrl,
          gstPercent: prod.gstPercent || 18.0,
          discountPercent: prod.discountPercent || 0.0,
          subtotal: prod.price
        }];
      }
      
      if (user) localStorage.setItem(`cart_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const adjustQuantity = (productId: string, amount: number, stockLimit?: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.productId === productId) {
          const qty = item.quantity + amount;
          if (qty <= 0) return null;
          if (stockLimit && qty > stockLimit) {
            alert(`Limited stock available (${stockLimit} left).`);
            return item;
          }
          return { ...item, quantity: qty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);

      if (user) {
        if (updated.length === 0) localStorage.removeItem(`cart_${user.id}`);
        else localStorage.setItem(`cart_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.productId !== productId);
      if (user) {
        if (updated.length === 0) localStorage.removeItem(`cart_${user.id}`);
        else localStorage.setItem(`cart_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCouponCode(null);
    setCouponDiscountPercent(0);
    if (user) localStorage.removeItem(`cart_${user.id}`);
  };

  const applyCoupon = async (code: string, storeId: string): Promise<boolean> => {
    if (!isOnline) {
      alert('Coupons verification requires active internet connectivity.');
      return false;
    }

    try {
      const res = await apiFetch('/api/loyalty/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, storeId, billAmount: subtotal })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to apply coupon.');
        return false;
      }

      setCouponCode(data.code);
      setCouponDiscountPercent(data.discountPercent);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Submit checkout order
  const submitCheckout = async (customerName?: string, customerEmail?: string): Promise<any> => {
    const storeId = user?.storeId;
    if (!storeId) return null;

    const payload = {
      storeId,
      customerName: customerName || user?.name || 'Walk-in Customer',
      customerEmail: customerEmail || user?.email || 'walkin@customer.com',
      items: cart,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: 'UPI'
    };

    if (!isOnline) {
      // Offline mode checkout queueing (Feature 16)
      const invoiceNumber = 'INV-OFF-' + Date.now().toString().slice(-6);
      const offlineOrder = {
        ...payload,
        invoiceNumber,
        createdAt: new Date().toISOString(),
        paymentStatus: 'PAID',
        txRef: `OFFLINE-SIM-${Date.now()}`
      };

      await queueOfflineOrder(offlineOrder);
      clearCart();
      alert('Offline transaction recorded successfully. It will sync automatically once internet returns.');
      return offlineOrder;
    }

    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout server failed.');
      }

      clearCart();
      return data;
    } catch (e: any) {
      alert(e.message || 'Checkout failed.');
      return null;
    }
  };

  // Auto-sync offline sales when returning online
  const syncOfflineData = async () => {
    const offlineOrders = await getOfflineOrders();
    if (offlineOrders.length === 0) return;

    console.log(`[Offline Sync] Found ${offlineOrders.length} offline orders to sync...`);

    try {
      const res = await apiFetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: offlineOrders })
      });

      const results = await res.json();
      if (res.ok) {
        console.log('[Offline Sync] Sync response: ', results);
        // Clear successfully synced orders from IndexedDB
        for (const item of results) {
          if (item.status === 'SUCCESS' || item.status === 'ALREADY_SYNCED') {
            await removeOfflineOrder(item.invoiceNumber);
          }
        }
        alert('All offline orders successfully synchronized with backend database!');
      }
    } catch (error) {
      console.error('[Offline Sync Failed] ', error);
    }
  };

  return (
    <CartContext.Provider value={{
      cart, subtotal, tax, discount, total, couponCode, couponDiscountPercent, isOnline,
      addToCart, adjustQuantity, removeFromCart, clearCart, applyCoupon, submitCheckout
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
