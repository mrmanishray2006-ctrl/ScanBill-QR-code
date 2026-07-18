'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Award, Share2, Sparkles, Gift, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoyaltyProgram() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  
  const [loyalty, setLoyalty] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [referralInput, setReferralInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLoyaltyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch loyalty points
      const loyaltyRes = await apiFetch(`/api/loyalty?storeId=${user.storeId || ''}`);
      if (loyaltyRes.ok) {
        const loyaltyData = await loyaltyRes.json();
        setLoyalty(loyaltyData);
      }

      // 2. Fetch active coupons
      const couponsRes = await apiFetch(`/api/loyalty/coupons?storeId=${user.storeId || ''}`);
      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(couponsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [user]);

  const handleApplyReferral = async () => {
    if (!referralInput) return;
    try {
      const res = await apiFetch('/api/loyalty/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: referralInput.toUpperCase(),
          storeId: user?.storeId
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Referral bonus successfully applied!');
        setReferralInput('');
        fetchLoyaltyData();
      } else {
        alert(data.error || 'Failed to apply referral code.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Loading loyalty dashboard...</div>;
  }

  // Tier progress calculations
  const points = loyalty?.points || 0;
  let nextTier = 'SILVER';
  let targetPoints = 100;
  let progressPercent = (points / 100) * 100;

  if (points >= 500) {
    nextTier = 'MAX TIER';
    targetPoints = 500;
    progressPercent = 100;
  } else if (points >= 300) {
    nextTier = 'PLATINUM';
    targetPoints = 500;
    progressPercent = ((points - 300) / 200) * 100;
  } else if (points >= 100) {
    nextTier = 'GOLD';
    targetPoints = 300;
    progressPercent = ((points - 100) / 200) * 100;
  }

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button onClick={() => router.push('/customer/home')} className="p-2 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-outfit">Loyalty Program</h2>
        <div className="w-9 h-9"></div>
      </div>

      {/* Points Card */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-2xl space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border-2 border-primary/20">
          <Award className="w-6 h-6" />
        </div>
        
        <div className="space-y-1">
          <span className="text-xs text-text-muted">Your reward points balance</span>
          <h2 className="text-4xl font-extrabold font-outfit text-primary">{points} <span className="text-sm font-semibold text-text-muted">points</span></h2>
          <span className="text-xs font-bold text-accent tracking-wide uppercase">{loyalty?.tier} LEVEL MEMBER</span>
        </div>

        {/* Tier progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>Current: {loyalty?.tier}</span>
            <span>Next Level: {nextTier} ({points}/{targetPoints} pts)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface border border-border overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}></div>
          </div>
        </div>
      </div>

      {/* Referral Box */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold font-outfit flex items-center gap-1.5 text-accent">
          <Share2 className="w-4 h-4 text-accent" /> Share Referral Code
        </h3>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Invite friends to shop! When they use your code, they save 15% on their first order and you get 50 bonus points automatically.
        </p>
        <div className="p-3 bg-background border border-border rounded-xl font-mono text-center font-bold text-sm select-all">
          {loyalty?.referralCode}
        </div>

        <div className="border-t border-border/20 pt-4 flex gap-2">
          <input
            type="text"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value)}
            placeholder="Apply Friend Code"
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs"
          />
          <button
            onClick={handleApplyReferral}
            className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-xs shadow-md"
          >
            Claim Bonus
          </button>
        </div>
      </div>

      {/* Reward Coupons */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold font-outfit flex items-center gap-1.5 text-primary">
          <Gift className="w-4 h-4 text-primary" /> Active Reward Coupons
        </h3>
        
        {coupons.length > 0 ? (
          <div className="space-y-3">
            {coupons.map(c => (
              <div key={c.id} className="p-3.5 rounded-2xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">{c.code}</h4>
                  <p className="text-[10px] text-text-muted mt-0.5">Expires: {new Date(c.expiresAt).toLocaleDateString()}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-green/10 text-green">
                  Save {c.discountPercent}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-text-muted py-4">No coupons available. Spend points to generate coupons.</p>
        )}
      </div>
    </div>
  );
}
