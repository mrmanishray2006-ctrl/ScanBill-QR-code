'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CreditCard, Check, ShieldAlert } from 'lucide-react';

export default function SubscriptionManager() {
  const { user, apiFetch } = useAuth();
  
  const [store, setStore] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      // 1. Fetch store profile
      const storeRes = await apiFetch(`/api/stores/${user.storeId}`);
      if (storeRes.ok) {
        const storeData = await storeRes.json();
        setStore(storeData);
      }

      // 2. Fetch billing logs (mock adapter for list)
      const logsRes = await apiFetch(`/api/orders?storeId=${user.storeId}&limit=10`); // standard list fallback
      if (logsRes.ok) {
        // Just mock some logs for subscription billing history
        setHistory([
          {
            id: 'TXN-SUB-902381',
            date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            plan: 'PROFESSIONAL',
            amount: 2499.00,
            method: 'Direct UPI Bank Payout',
            status: 'Completed'
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const handleUpgradePlan = async (planName: string) => {
    try {
      const res = await apiFetch(`/api/stores/${user?.storeId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planName,
          txRef: `UPI-SUB-UPG-${Date.now()}`
        })
      });

      if (res.ok) {
        alert(`Successfully updated subscription plan to ${planName}!`);
        fetchSubscription();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Loading billing details...</div>;
  }

  const isStarter = store?.subscriptionPlan === 'STARTER';
  const isPro = store?.subscriptionPlan === 'PROFESSIONAL';
  const isBusiness = store?.subscriptionPlan === 'BUSINESS';
  const isEnterprise = store?.subscriptionPlan === 'ENTERPRISE';

  const planOptions = [
    {
      name: 'STARTER',
      price: 999.00,
      desc: 'Perfect for small retailers starting with digital billing workflows.',
      features: ['Up to 50 active products', 'Basic stock counting', 'Instant QR codes', 'Offline billing synced', 'Direct UPI payment QR'],
      isActive: isStarter
    },
    {
      name: 'PROFESSIONAL',
      price: 2499.00,
      desc: 'For active storefronts requiring fully featured dashboards and PDF logs.',
      features: ['Up to 500 active products', 'Full inventory levels & alerts', 'Instant QR codes', 'Voice billing support', 'AI Business Insights summaries'],
      isActive: isPro
    },
    {
      name: 'ENTERPRISE',
      price: 5999.00,
      desc: 'Built for chains and high-volume stores needing dedicated server setups.',
      features: ['Unlimited active products', 'Advanced AI predictive demand', 'Multi-Store catalog controls', 'Employee shift attendance logs', 'Razorpay card gateway support'],
      isActive: isEnterprise
    }
  ];

  return (
    <div className="space-y-8 dark text-foreground">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Subscription Management</h1>
        <p className="text-sm text-text-muted mt-1">Configure SaaS billing cycles and inspect payment history logs</p>
      </div>

      {/* Status Alert Banner */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-green/10 text-green rounded-full uppercase tracking-wider">Active Cycle</span>
          <h2 className="text-2xl font-bold font-outfit mt-2">{store?.subscriptionPlan} STORE PLAN</h2>
          <p className="text-sm text-text-muted mt-0.5">Renews on: {new Date(store?.subscriptionExpiresAt).toLocaleDateString([], { dateStyle: 'long' })}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-outfit text-primary">₹{store?.subscriptionPlan === 'STARTER' ? '999' : store?.subscriptionPlan === 'PROFESSIONAL' ? '2,499' : '5,999'}</div>
          <span className="text-xs text-text-muted">/ month billing</span>
        </div>
      </div>

      {/* Tiers list */}
      <h3 className="text-xl font-bold font-outfit mt-12 mb-6">Available Store Tiers</h3>
      <div className="grid gap-6 md:grid-cols-3">
        {planOptions.map(plan => (
          <div key={plan.name} className={`p-6 rounded-3xl glass-card border flex flex-col justify-between shadow-xl ${plan.isActive ? 'border-primary shadow-primary/5 bg-primary/5' : 'border-white/5 hover:border-white/10'}`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold font-outfit tracking-wider text-text-muted uppercase">{plan.name}</span>
                {plan.isActive && <span className="px-2 py-0.5 text-[9px] font-bold bg-primary text-white rounded uppercase tracking-wider">Active</span>}
              </div>
              <h4 className="text-3xl font-extrabold font-outfit text-foreground">₹{plan.price} <span className="text-xs font-normal text-text-muted">/ mo</span></h4>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">{plan.desc}</p>
              
              <ul className="mt-6 space-y-3">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-green mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleUpgradePlan(plan.name)}
              disabled={plan.isActive}
              className={`w-full mt-8 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${plan.isActive ? 'bg-primary/20 text-primary cursor-default' : 'bg-primary text-white hover:bg-primary-dark hover:shadow-lg'}`}
            >
              {plan.isActive ? 'Current Plan' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* History table */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
        <h3 className="text-lg font-bold font-outfit mb-4">Billing logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border font-bold text-text-muted uppercase tracking-wider">
                <th className="pb-3">Invoice Transaction ID</th>
                <th className="pb-3">Billing Date</th>
                <th className="pb-3">Tier detail</th>
                <th className="pb-3">Amount paid</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {history.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 font-semibold font-mono text-primary">{log.id}</td>
                  <td className="py-3">{log.date}</td>
                  <td className="py-3 font-bold">{log.plan} Store Plan</td>
                  <td className="py-3 font-bold">₹{log.amount.toFixed(2)}</td>
                  <td className="py-3 text-text-muted">{log.method}</td>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-green/10 text-green font-bold text-[10px]">{log.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
