'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Eye, Calendar } from 'lucide-react';

export default function CustomerHistory() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await apiFetch(`/api/orders?customerId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button onClick={() => router.push('/customer/home')} className="p-2 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-outfit">Receipts History</h2>
        <div className="w-9 h-9"></div>
      </div>

      {/* Receipts list */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 shadow-xl">
        {loading ? (
          <div className="text-center py-6 text-text-muted text-xs">Loading logs...</div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((o) => {
              const dt = new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
              return (
                <div
                  key={o.id}
                  onClick={() => router.push(`/customer/receipt?id=${o.id}`)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-foreground">{o.invoiceNumber}</h4>
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" /> {dt}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-green text-sm">₹{o.total.toFixed(2)}</span>
                    <button className="p-2 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-text-muted text-xs">
            No purchases logged in your account history.
          </div>
        )}
      </div>
    </div>
  );
}
