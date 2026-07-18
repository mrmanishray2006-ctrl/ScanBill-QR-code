'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, Store as StoreIcon, CreditCard, ArrowLeft, KeySquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, signup, user } = useAuth();
  
  const portalParam = searchParams.get('portal') || 'customer';
  const isOwner = portalParam === 'owner';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'CUSTOMER') router.push('/customer/home');
      else router.push('/owner/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') {
      await login(email, password);
    } else {
      const payload: any = {
        name,
        email,
        password,
        role: isOwner ? 'OWNER' : 'CUSTOMER'
      };
      if (isOwner) {
        payload.storeName = storeName;
        payload.upiId = upiId;
      }
      await signup(payload);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-background font-sans dark text-foreground">
      {/* Back Button */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-1 text-sm font-medium text-text-muted hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Home
      </button>

      <div className="w-full max-w-md">
        {/* Portal Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold font-outfit">
            {isOwner ? 'Owner Dashboard Portal' : 'Customer Shop Portal'}
          </h1>
          <p className="text-sm text-text-muted mt-2">
            {isOwner 
              ? 'Access catalog controls, employees, and sales analytics' 
              : 'Scan items, apply coupons, and checkout via UPI'
            }
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 mb-6 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'login' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-foreground'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'register' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-foreground'}`}
          >
            Create Account
          </button>
        </div>

        {/* Form Card */}
        <div className="p-8 rounded-3xl glass-card border border-white/5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {activeTab === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Full Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-muted">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Owner specific register fields */}
            {isOwner && activeTab === 'register' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted">Store Name</label>
                  <div className="relative flex items-center">
                    <StoreIcon className="absolute left-3 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Kumar Digital Mart"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted">Merchant UPI VPA (for direct client payouts)</label>
                  <div className="relative flex items-center">
                    <CreditCard className="absolute left-3 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="kumar.mart@okicici"
                      pattern="^[^@]+@[^@]+$"
                      title="Invalid UPI ID. Must contain @ (e.g. name@okaxis)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-muted">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
            >
              {activeTab === 'login' ? 'Sign In' : 'Register Store'}
            </button>
          </form>

          {/* Toggle portal link */}
          <div className="text-center mt-6 text-xs text-text-muted">
            {isOwner ? (
              <button onClick={() => router.push('/login?portal=customer')} className="underline hover:text-foreground">
                Are you a Customer? Sign in here
              </button>
            ) : (
              <button onClick={() => router.push('/login?portal=owner')} className="underline hover:text-foreground">
                Registering a Store Owner account? Click here
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
