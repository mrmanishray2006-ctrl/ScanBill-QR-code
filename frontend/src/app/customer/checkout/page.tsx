'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Wallet, ShoppingBag } from 'lucide-react';

export default function CustomerCheckout() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const { cart, subtotal, tax, discount, total, submitCheckout } = useCart();
  const [store, setStore] = useState<any>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (cart.length === 0) {
      router.push('/customer/cart');
      return;
    }
    
    const fetchStoreDetails = async () => {
      if (!user?.storeId) return;
      try {
        const res = await apiFetch(`/api/stores/${user.storeId}`);
        if (res.ok) {
          const data = await res.json();
          setStore(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    setInvoiceNumber('INV-' + Date.now().toString().slice(-6));
    fetchStoreDetails();
  }, [user]);

  const handleProceedToPayment = async () => {
    setProcessing(true);
    // Create the order on the backend (returns order details with PENDING status)
    const order = await submitCheckout(user?.name, user?.email);
    setProcessing(false);
    
    if (order) {
      // Stash order id in sessionStorage for payment page
      sessionStorage.setItem('current_checkout_order_id', order.id);
      router.push('/customer/payment');
    }
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button onClick={() => router.push('/customer/cart')} className="p-2 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-outfit">Invoice Summary</h2>
        <div className="w-9 h-9"></div> {/* spacer */}
      </div>

      {/* Invoice Card Container */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-2xl space-y-6">
        
        {/* Invoice Bill Header */}
        <div className="flex items-start justify-between pb-6 border-b border-border/40">
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base font-outfit">{store?.name || 'QuickStore Mart'}</h3>
              <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{store?.address || 'MG Road, Bangalore'}</p>
            </div>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-xs text-primary tracking-wide uppercase">{invoiceNumber}</h4>
            <p className="text-[10px] text-text-muted mt-0.5">{new Date().toLocaleDateString([], { dateStyle: 'medium' })}</p>
          </div>
        </div>

        {/* Billed To Row */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-bold text-text-muted block uppercase tracking-wider text-[10px]">Billed To</span>
            <p className="font-semibold mt-1">{user?.name}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{user?.email}</p>
          </div>
          <div className="text-right">
            <span className="font-bold text-text-muted block uppercase tracking-wider text-[10px]">Payment Method</span>
            <p className="font-semibold mt-1">BHIM UPI Instant Gateway</p>
          </div>
        </div>

        {/* Invoice itemized list table */}
        <div className="border-t border-b border-border/40 py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="font-bold text-text-muted uppercase text-[9px] tracking-wider border-b border-border/20 pb-2 block">
                <th className="w-3/5 text-left inline-block">Product Title</th>
                <th className="w-1/5 text-center inline-block">Qty</th>
                <th className="w-1/5 text-right inline-block">Subtotal</th>
              </tr>
            </thead>
            <tbody className="block max-h-60 overflow-y-auto divide-y divide-border/20 mt-2">
              {cart.map((item) => (
                <tr key={item.productId} className="block py-3">
                  <td className="w-3/5 inline-block pr-2">
                    <span className="font-semibold text-foreground block truncate">{item.name}</span>
                    <span className="text-[9px] text-text-muted font-mono mt-0.5">SKU: {item.sku}</span>
                  </td>
                  <td className="w-1/5 text-center inline-block font-semibold">x{item.quantity}</td>
                  <td className="w-1/5 text-right inline-block font-extrabold text-foreground">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals split */}
        <div className="space-y-2 text-xs border-b border-border/40 pb-6">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>CGST/SGST Tax (18%):</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Coupon savings:</span>
            <span className="text-green">-₹{discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border/20">
            <span>Final Net Total:</span>
            <span className="text-base text-primary">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-[10px] text-text-muted leading-relaxed text-center italic">
          This digital invoice is compiled on checkout verification. Ensure that all products match shelf labels.
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push('/customer/cart')}
          className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 font-semibold text-sm transition-all"
        >
          Back to Cart
        </button>
        <button
          onClick={handleProceedToPayment}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-lg shadow-accent/25 hover:bg-accent-dark transition-all"
        >
          <Wallet className="w-4 h-4" /> {processing ? 'Processing...' : 'Proceed to Pay'}
        </button>
      </div>
    </div>
  );
}
