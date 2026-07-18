'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Settings, Store, CreditCard } from 'lucide-react';

export default function StoreSettings() {
  const { user, apiFetch } = useAuth();
  
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [paymentUpiId, setPaymentUpiId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');

  const fetchStore = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/stores/${user.storeId}`);
      if (res.ok) {
        const data = await res.json();
        setStore(data);
        setName(data.name);
        setAddress(data.address);
        setLogoUrl(data.logoUrl || '');
        setPaymentUpiId(data.paymentUpiId);
        setMerchantName(data.merchantName);
        setRazorpayKeyId(data.razorpayKeyId || '');
        setRazorpayKeySecret(data.razorpayKeySecret || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name, address, logoUrl,
      paymentUpiId, merchantName,
      razorpayKeyId, razorpayKeySecret
    };

    try {
      const res = await apiFetch(`/api/stores/${user?.storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Settings updated successfully!');
        fetchStore();
      } else {
        alert('Failed to update store configurations.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Store Settings</h1>
        <p className="text-sm text-text-muted mt-1">Configure retail profiles and manage banking payout credentials</p>
      </div>

      <form onSubmit={handleSaveSettings} className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl space-y-4">
          <h3 className="text-lg font-bold font-outfit flex items-center gap-1.5 text-primary">
            <Store className="w-5 h-5 text-primary" /> Store Profile Settings
          </h3>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Store Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Physical Address</label>
            <textarea rows={3} required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Store Logo URL</label>
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://unsplash.com/logo.png" className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
          </div>
        </div>

        {/* Payments Card */}
        <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl space-y-4">
          <h3 className="text-lg font-bold font-outfit flex items-center gap-1.5 text-accent">
            <CreditCard className="w-5 h-5 text-accent" /> Payment Credentials Settings
          </h3>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Merchant UPI Address (VPA) *</label>
            <input type="text" required value={paymentUpiId} onChange={(e) => setPaymentUpiId(e.target.value)} placeholder="e.g. store@okaxis" className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
            <span className="text-[10px] text-text-muted">UPI QR checkouts deposit directly to this address.</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Merchant Display Name *</label>
            <input type="text" required value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="Kumar Digital Mart" className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Razorpay Key ID (Backups)</label>
            <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_test_xxxxxx" className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted uppercase">Razorpay Secret Key</label>
            <input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm" />
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 border-t border-border pt-4">
          <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-dark transition-all">
            Save Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
