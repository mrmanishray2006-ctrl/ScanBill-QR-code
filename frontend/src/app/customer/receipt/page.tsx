'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Check, Printer, Home, Share2 } from 'lucide-react';

export default function CustomerReceipt() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiFetch } = useAuth();
  
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      router.push('/customer/home');
      return;
    }

    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const orderRes = await apiFetch(`/api/orders/${orderId}`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrder(orderData);

          const storeRes = await apiFetch(`/api/stores/${orderData.storeId}`);
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

    fetchReceipt();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!order || !store) return;
    const text = `Hi, I paid ₹${order.total.toFixed(2)} at ${store.name} for invoice ${order.invoiceNumber}. TxRef: ${order.txRef}.`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Loading payment receipt...</div>;
  }

  if (!order || !store) {
    return <div className="text-center py-12 text-danger">Receipt parameters not found.</div>;
  }

  return (
    <div className="space-y-6 dark text-foreground print-card">
      {/* Success banner */}
      <div className="text-center py-6 space-y-3 no-print">
        <div className="w-12 h-12 rounded-full bg-green/10 text-green flex items-center justify-center mx-auto border-2 border-green/20">
          <Check className="w-6 h-6 text-green" />
        </div>
        <h1 className="text-2xl font-extrabold font-outfit">Transaction Successful</h1>
        <p className="text-xs text-text-muted">Payment confirmed & stock levels depleted.</p>
      </div>

      {/* Invoice Card */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-border/40">
          <div className="flex gap-2">
            <div>
              <h3 className="font-extrabold text-base font-outfit">{store.name}</h3>
              <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{store.address}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-0.5 text-[8px] font-bold bg-green/15 text-green rounded tracking-wider uppercase">Paid</span>
            <h4 className="font-bold text-xs text-primary tracking-wide uppercase mt-1.5">{order.invoiceNumber}</h4>
            <p className="text-[10px] text-text-muted mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Meta details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-bold text-text-muted block uppercase tracking-wider text-[10px]">Billed To</span>
            <p className="font-semibold mt-1">{order.customerName}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{order.customerEmail}</p>
          </div>
          <div className="text-right">
            <span className="font-bold text-text-muted block uppercase tracking-wider text-[10px]">Transaction Reference</span>
            <p className="font-mono text-green font-semibold mt-1">{order.txRef || '—'}</p>
            <p className="text-[9px] text-text-muted mt-0.5">Paid at: {new Date(order.updatedAt).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Itemized list */}
        <div className="border-t border-b border-border/40 py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="font-bold text-text-muted uppercase text-[9px] tracking-wider border-b border-border/20 pb-2 block">
                <th className="w-3/5 text-left inline-block">Product Title</th>
                <th className="w-1/5 text-center inline-block">Qty</th>
                <th className="w-1/5 text-right inline-block">Subtotal</th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-border/20 mt-2">
              {order.items.map((item: any) => (
                <tr key={item.id} className="block py-3">
                  <td className="w-3/5 inline-block pr-2">
                    <span className="font-semibold text-foreground block truncate">{item.name}</span>
                  </td>
                  <td className="w-1/5 text-center inline-block font-semibold">x{item.quantity}</td>
                  <td className="w-1/5 text-right inline-block font-extrabold text-foreground">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal:</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>GST Tax (18% inclusive):</span>
            <span>₹{order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Coupon savings:</span>
            <span className="text-green">-₹{order.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border/20">
            <span>Final Paid Amount:</span>
            <span className="text-base text-green">₹{order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-[10px] text-text-muted text-center italic border-t border-border/20 pt-4 leading-normal">
          Thank you for shopping with us! This digital receipt is sent to your email.
        </div>
      </div>

      {/* Sharing and Action buttons */}
      <div className="flex flex-col gap-3 no-print">
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border hover:bg-white/5 font-semibold text-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </button>
          
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border hover:bg-white/5 font-semibold text-sm transition-all text-green"
          >
            <Share2 className="w-4 h-4" /> Share Receipt
          </button>
        </div>

        <button
          onClick={() => router.push('/customer/home')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-lg shadow-accent/20 hover:bg-accent-dark transition-all"
        >
          <Home className="w-4 h-4" /> Return Home
        </button>
      </div>
    </div>
  );
}
