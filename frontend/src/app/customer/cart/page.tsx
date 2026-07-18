'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useVoiceBilling } from '../../../hooks/useVoiceBilling';
import { ArrowLeft, Trash2, Mic, MicOff, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomerCart() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const {
    cart, subtotal, tax, discount, total, couponCode,
    adjustQuantity, removeFromCart, clearCart, applyCoupon
  } = useCart();

  const [products, setProducts] = useState<any[]>([]);
  const [promoText, setPromoText] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-US');

  // Load catalog to supply matching context to voice parser
  useEffect(() => {
    const loadCatalog = async () => {
      if (!user?.storeId) return;
      try {
        const res = await apiFetch(`/api/products?storeId=${user.storeId}&status=active`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadCatalog();
  }, [user]);

  const handleCheckoutTrigger = () => {
    router.push('/customer/checkout');
  };

  // Bind the Web Speech API voice billing hook (Feature 3 compliance)
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport
  } = useVoiceBilling({
    products,
    onCheckoutTrigger: handleCheckoutTrigger
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(voiceLang);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoText) return;
    if (!user?.storeId) return;
    const success = await applyCoupon(promoText.toUpperCase(), user.storeId);
    if (success) {
      setPromoText('');
    }
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button onClick={() => router.push('/customer/home')} className="p-2 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-outfit">Shopping Cart</h2>
        <button onClick={clearCart} className="p-2 rounded-xl border border-danger/20 text-danger text-xs font-bold hover:bg-danger/10">
          Clear
        </button>
      </div>

      {/* Voice Billing Helper Panel */}
      {hasSupport && (
        <div className="p-5 rounded-3xl glass-card border border-primary/20 shadow-lg relative overflow-hidden bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-primary font-bold text-sm">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span>Voice Billing Assistant</span>
            </div>
            
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="px-2 py-1 rounded bg-background border border-border text-[10px] focus:outline-none"
            >
              <option value="en-US">English</option>
              <option value="hi-IN">Hindi (हिंदी)</option>
              <option value="mr-IN">Marathi (मराठी)</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleMicClick}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-danger text-white pulse-red' : 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark'}`}
              title="Click to speak command"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <div className="flex-1 text-xs">
              {isListening ? (
                <p className="text-danger font-semibold animate-pulse">Listening... speak command now</p>
              ) : transcript ? (
                <p className="text-foreground">Command: <span className="font-semibold italic">"{transcript}"</span></p>
              ) : (
                <p className="text-text-muted">Say: "Add 2 Mouse", "Remove Wallet", or "Checkout"</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart items list */}
      <div className="space-y-4">
        {cart.length > 0 ? (
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-surface-card border border-border"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">{item.name}</h4>
                  <p className="text-xs text-text-muted">₹{item.price.toFixed(2)} | GST: {item.gstPercent}%</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Quantity adjusters */}
                  <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-1">
                    <button onClick={() => adjustQuantity(item.productId, -1)} className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-lg hover:bg-white/5">-</button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => adjustQuantity(item.productId, 1)} className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-lg hover:bg-white/5">+</button>
                  </div>
                  
                  <button onClick={() => removeFromCart(item.productId)} className="p-2 text-danger hover:bg-danger/10 rounded-xl" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-12 text-text-muted text-xs bg-surface-card border border-border rounded-3xl">
            Your shopping cart is empty. Scan items to add them.
          </div>
        )}
      </div>

      {/* Totals Invoice Box */}
      {cart.length > 0 && (
        <div className="p-5 rounded-3xl glass-card border border-white/5 shadow-xl space-y-4">
          <h3 className="text-base font-bold font-outfit">Receipt Totals</h3>
          
          <div className="space-y-2 text-xs divide-y divide-border/20">
            <div className="flex justify-between py-2 text-text-muted">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-text-muted">
              <span>CGST/SGST Tax (18% inclusive)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-text-muted">
              <span>Promotional Savings</span>
              <span className="text-green">-₹{discount.toFixed(2)}</span>
            </div>
            
            {couponCode && (
              <div className="flex justify-between py-2 text-green font-semibold">
                <span>Active Coupon Code</span>
                <span>{couponCode} (-{couponDiscountPercent}%)</span>
              </div>
            )}
            
            <div className="flex justify-between py-3 text-sm font-extrabold text-foreground border-t border-border pt-4">
              <span>Final Total</span>
              <span className="text-lg text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Promo code wrapper */}
          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <Tag className="absolute left-3 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={promoText}
                onChange={(e) => setPromoText(e.target.value)}
                placeholder="PROMOCODE"
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs"
              />
            </div>
            <button
              onClick={handleApplyPromo}
              className="px-4 py-2 rounded-xl border border-border hover:bg-white/5 text-xs font-bold"
            >
              Apply
            </button>
          </div>

          <button
            onClick={handleCheckoutTrigger}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-lg shadow-accent/25 hover:bg-accent-dark hover:shadow-xl transition-all"
          >
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
