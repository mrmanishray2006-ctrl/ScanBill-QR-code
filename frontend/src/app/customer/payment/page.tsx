'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { generateQRCodeSVG } from '../../../utils/qr';
import { ArrowLeft, ShieldCheck, Smartphone, CheckCircle, XCircle, Terminal } from 'lucide-react';

export default function CustomerPayment() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const { isOnline } = useCart();
  const [store, setStore] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const orderId = sessionStorage.getItem('current_checkout_order_id');
    if (!orderId) {
      router.push('/customer/cart');
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // 1. Fetch Order details
        const orderRes = await apiFetch(`/api/orders/${orderId}`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrder(orderData);
        }

        // 2. Fetch Store gateway
        if (user?.storeId) {
          const storeRes = await apiFetch(`/api/stores/${user.storeId}`);
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            setStore(storeData);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [user]);

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Loading secure billing gateway...</div>;
  }

  if (!order || !store) {
    return <div className="text-center py-12 text-danger">Failed to load order parameters.</div>;
  }

  // Construct dynamic UPI deep link (Feature 4 compliance)
  // Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=INVOICE&cu=INR
  const upiDeepLink = `upi://pay?pa=${store.paymentUpiId}&pn=${encodeURIComponent(store.merchantName)}&am=${order.total.toFixed(2)}&tn=${order.invoiceNumber}&cu=INR`;

  // Sandbox simulation triggers
  const handlePaymentCallback = async (success: boolean) => {
    setVerifying(true);
    try {
      const res = await apiFetch(`/api/orders/${order.id}/simulate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success,
          txRef: success ? `UPI-SANDBOX-${Date.now()}` : undefined
        })
      });

      const data = await res.json();
      setVerifying(false);

      if (success && res.ok) {
        alert('Payment verified! Redirecting to receipt page.');
        sessionStorage.setItem('last_successful_order_id', order.id);
        router.push(`/customer/receipt?id=${order.id}`);
      } else {
        alert(data.message || 'Payment simulation failed.');
        if (!success) router.push('/customer/cart');
      }
    } catch (e) {
      console.error(e);
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button onClick={() => router.push('/customer/checkout')} className="p-2 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-outfit">Secure Checkout</h2>
        <div className="w-9 h-9"></div>
      </div>

      {/* UPI QR Frame Card */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-2xl space-y-6 text-center">
        <div className="flex items-center gap-2 justify-center text-green font-semibold text-sm">
          <ShieldCheck className="w-5 h-5 text-green" />
          <span>Direct P2P Bank Payout</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-text-muted">Credited to:</span>
          <h4 className="font-extrabold text-base font-outfit">{store.merchantName}</h4>
          <p className="text-[10px] text-text-muted font-mono">{store.paymentUpiId}</p>
        </div>

        <div className="space-y-1 py-4 border-t border-b border-border/40">
          <span className="text-xs text-text-muted">Amount to Pay</span>
          <h2 className="text-3xl font-extrabold font-outfit text-primary">₹{order.total.toFixed(2)}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-light dark:bg-white/5 border border-border font-bold tracking-wide uppercase text-text-muted">{order.invoiceNumber}</span>
        </div>

        {/* Dynamic SVG QR code */}
        <div 
          className="w-48 h-48 mx-auto p-3 bg-white rounded-2xl flex items-center justify-center shadow-inner"
          dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(upiDeepLink) }}
        />
        
        <p className="text-[10px] text-text-muted leading-relaxed">
          Scan using GPay, PhonePe, Paytm, or BHIM apps.
        </p>

        {/* Mobile deep link */}
        <a
          href={upiDeepLink}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark hover:shadow-xl transition-all"
        >
          <Smartphone className="w-4 h-4" /> Pay via Mobile App
        </a>
      </div>

      {/* Simulator Sandbox Controller (Feature 4 & 15 compliance) */}
      <div className="p-5 rounded-3xl bg-surface-card border border-border/60 shadow-lg space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
          <Terminal className="w-4 h-4" />
          <span>Payment Sandbox Simulation Controller</span>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Simulate the payment gateway callback hooks to verify orders logs, stock depletion levels, and WhatsApp/Email dispatches.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => handlePaymentCallback(false)}
            disabled={verifying}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl border border-danger/25 text-danger font-bold text-xs hover:bg-danger/10 transition-all"
          >
            <XCircle className="w-4 h-4" /> Simulate Failure
          </button>
          
          <button
            onClick={() => handlePaymentCallback(true)}
            disabled={verifying}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-green text-white font-bold text-xs shadow-md hover:bg-green-dark transition-all animate-pulse"
          >
            <CheckCircle className="w-4 h-4" /> {verifying ? 'Verifying...' : 'Simulate Success'}
          </button>
        </div>
      </div>
    </div>
  );
}
