'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { ScanLine, ShoppingCart, History, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerHome() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const { cart } = useCart();
  const [historyCount, setHistoryCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const res = await apiFetch(`/api/orders?customerId=${user.id}&limit=3`);
        if (res.ok) {
          const data = await res.json();
          setHistoryCount(data.pagination.totalCount);
          setRecentOrders(data.orders);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchHistory();
  }, [user]);

  const totalCartItems = cart.reduce((s, item) => s + item.quantity, 0);

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Greeting banner */}
      <div>
        <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Hello, Shopper!</h1>
        <p className="text-sm text-text-muted mt-1">Scan product QR tags around the store to instantly compile and pay your bill.</p>
      </div>

      {/* Camera shortcut */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push('/customer/scanner')}
        className="p-6 rounded-3xl bg-primary text-white shadow-xl shadow-primary/20 flex items-center justify-between cursor-pointer pulse-blue"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <ScanLine className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg font-outfit">Open Quick Scanner</h3>
            <p className="text-xs text-white/80 mt-0.5">Scan product tags to add directly to your cart</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 opacity-80" />
      </motion.div>

      {/* Grid stats */}
      <div className="grid gap-4 grid-cols-2">
        <div
          onClick={() => router.push('/customer/cart')}
          className="p-4 rounded-2xl bg-surface-card border border-border flex items-center gap-3 cursor-pointer hover:bg-white/5"
        >
          <div className="p-2.5 bg-accent/10 text-accent rounded-xl"><ShoppingCart className="w-5 h-5" /></div>
          <div>
            <h4 className="text-base font-bold font-outfit">{totalCartItems} Items</h4>
            <span className="text-[10px] text-text-muted">Active Cart</span>
          </div>
        </div>

        <div
          onClick={() => router.push('/customer/history')}
          className="p-4 rounded-2xl bg-surface-card border border-border flex items-center gap-3 cursor-pointer hover:bg-white/5"
        >
          <div className="p-2.5 bg-green/10 text-green rounded-xl"><History className="w-5 h-5" /></div>
          <div>
            <h4 className="text-base font-bold font-outfit">{historyCount} Receipts</h4>
            <span className="text-[10px] text-text-muted">Purchase History</span>
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 shadow-xl">
        <h3 className="text-base font-bold font-outfit mb-4">My Recent Transactions</h3>
        {recentOrders.length > 0 ? (
          <div className="space-y-3.5">
            {recentOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => router.push(`/customer/receipt?id=${o.id}`)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-background/50 border border-border cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-xs">{o.invoiceNumber}</h4>
                  <p className="text-[10px] text-text-muted mt-0.5">Date: {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-extrabold text-green">₹{o.total.toFixed(2)}</span>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-text-muted py-6">No purchases yet. Start shopping!</p>
        )}
      </div>
    </div>
  );
}
