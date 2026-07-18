'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Boxes, Search, RefreshCw, AlertTriangle } from 'lucide-react';

export default function InventoryControl() {
  const { user, apiFetch } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Custom manual inputs
  const [adjustments, setAdjustments] = useState<{ [id: string]: string }>({});

  const fetchInventory = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/products?storeId=${user.storeId}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [user, search]);

  const handleAdjustmentInput = (id: string, value: string) => {
    setAdjustments(prev => ({ ...prev, [id]: value }));
  };

  const executeStockAdjust = async (prod: any, amount: number) => {
    const nextQty = Math.max(0, prod.stockQty + amount);
    try {
      const res = await apiFetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQty: nextQty })
      });
      if (res.ok) fetchInventory();
    } catch (e) {
      console.error(e);
    }
  };

  const applyManualInput = async (prod: any) => {
    const inputVal = parseInt(adjustments[prod.id]);
    if (isNaN(inputVal)) {
      alert('Please enter a valid stock change integer.');
      return;
    }

    const nextQty = Math.max(0, prod.stockQty + inputVal);
    try {
      const res = await apiFetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQty: nextQty })
      });
      if (res.ok) {
        setAdjustments(prev => ({ ...prev, [prod.id]: '' }));
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Inventory Control</h1>
          <p className="text-sm text-text-muted mt-1">Audit, monitor stock metrics, and quick-adjust levels</p>
        </div>
      </div>

      {/* Action Table Card */}
      <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full sm:max-w-md flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product stock levels..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={fetchInventory}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface-light dark:bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Levels
          </button>
        </div>

        {/* Responsive Table */}
        {loading ? (
          <div className="text-center py-12 text-text-muted text-sm">Loading stock levels...</div>
        ) : products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
                  <th className="pb-4">Product details</th>
                  <th className="pb-4">SKU Code</th>
                  <th className="pb-4">Category</th>
                  <th className="pb-4">Current Stock</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Manual Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {products.map((p) => {
                  const lowStock = p.stockQty < p.reorderPoint;
                  const outOfStock = p.stockQty === 0;

                  return (
                    <tr key={p.id} className="text-sm">
                      <td className="py-4">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-xs text-text-muted mt-0.5">Price: ₹{p.price.toFixed(2)}</div>
                      </td>
                      <td className="py-4 font-mono text-xs">{p.sku}</td>
                      <td className="py-4">{p.category}</td>
                      <td className="py-4">
                        <span className={`font-bold text-base ${lowStock ? 'text-danger' : 'text-foreground'}`}>
                          {p.stockQty}
                        </span>
                      </td>
                      <td className="py-4">
                        {outOfStock ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-danger/10 text-danger pulse-red">Out of stock</span>
                        ) : lowStock ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-warning/10 text-warning">Low stock</span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-green/10 text-green">In stock</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => executeStockAdjust(p, -10)} className="px-2 py-1 text-xs font-bold rounded bg-surface-light dark:bg-white/5 border border-border hover:bg-white/10">-10</button>
                          <button onClick={() => executeStockAdjust(p, -1)} className="px-2 py-1 text-xs font-bold rounded bg-surface-light dark:bg-white/5 border border-border hover:bg-white/10">-1</button>
                          
                          <input
                            type="number"
                            value={adjustments[p.id] || ''}
                            onChange={(e) => handleAdjustmentInput(p.id, e.target.value)}
                            placeholder="0"
                            className="w-16 px-2 py-1 rounded text-center border border-border bg-background focus:outline-none focus:border-primary text-xs"
                          />
                          
                          <button onClick={() => executeStockAdjust(p, 1)} className="px-2 py-1 text-xs font-bold rounded bg-surface-light dark:bg-white/5 border border-border hover:bg-white/10">+1</button>
                          <button onClick={() => executeStockAdjust(p, 10)} className="px-2 py-1 text-xs font-bold rounded bg-surface-light dark:bg-white/5 border border-border hover:bg-white/10">+10</button>
                          <button onClick={() => applyManualInput(p)} className="ml-2 px-3 py-1 text-xs font-bold rounded bg-primary text-white hover:bg-primary-dark">Apply</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted text-sm">No items in inventory directory.</div>
        )}
      </div>
    </div>
  );
}
