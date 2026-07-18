'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ShoppingCart, Store, ArrowRight, Code } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-background font-sans dark">
      {/* Splash Logo */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-12 text-center"
      >
        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 pulse-blue">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-foreground sm:text-5xl">
          QuickStore Smart Billing
        </h1>
        <p className="max-w-md mt-3 text-base text-text-muted">
          AI-Powered Retail Stores, Instant QR Self-Checkouts, and Voice Register Systems.
        </p>
      </motion.div>

      {/* Choice Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid w-full max-w-4xl gap-6 sm:grid-cols-2"
      >
        {/* Customer Card */}
        <motion.div
          variants={cardVariants}
          onClick={() => router.push('/login?portal=customer')}
          className="flex flex-col justify-between p-8 rounded-3xl cursor-pointer glass-card border border-white/5 hover:border-accent/40 group hover:shadow-2xl hover:shadow-accent/5 transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-xl bg-accent/15 text-accent group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold font-outfit text-foreground mb-2">
              Customer Shopping
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Scan product QR tags, build your active basket, redeem loyalty referral coupons, and pay instantly using direct UPI apps.
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-8 font-semibold text-accent text-sm">
            Enter Shopping Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Owner Card */}
        <motion.div
          variants={cardVariants}
          onClick={() => router.push('/login?portal=owner')}
          className="flex flex-col justify-between p-8 rounded-3xl cursor-pointer glass-card border border-white/5 hover:border-primary/40 group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-xl bg-primary/15 text-primary group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold font-outfit text-foreground mb-2">
              Store Owner & Admin
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Manage multi-store inventories, allocate cashier accounts, clock attendance, audit logs, and inspect AI sales projections.
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-8 font-semibold text-primary text-sm">
            Enter Owner Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </motion.div>
      
      <div className="mt-16 text-xs text-text-muted flex items-center gap-1">
        <Code className="w-3 h-3" /> QuickStore v2.0 Enterprise SaaS
      </div>
    </div>
  );
}
