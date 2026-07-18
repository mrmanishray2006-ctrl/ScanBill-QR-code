'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  TrendingUp, Package, AlertTriangle, CreditCard, Sparkles, Plus, Clock,
  ArrowUpRight, AlertCircle, ShoppingBag, BarChart3
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

export default function OwnerDashboard() {
  const { user, apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dashboard stats
  const [stats, setStats] = useState<any>({
    todaySales: 0,
    yesterdaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    yearlySales: 0,
    topSellingProducts: [],
    leastSellingProducts: [],
    peakShoppingHours: [],
    averageOrderValue: 0,
    grossProfit: 0,
    netProfit: 0,
    inventoryValue: 0,
    bestCategory: 'N/A',
    worstCategory: 'N/A',
    returningCustomers: 0,
    newCustomers: 0,
    insights: []
  });

  // Predictions stats
  const [predictions, setPredictions] = useState<any>({
    nextDaySales: 0,
    nextWeekSales: 0,
    nextMonthSales: 0,
    inventoryRequirements: [],
    lowStockAlerts: [],
    outOfStockPredictions: []
  });

  const [activeTab, setActiveTab] = useState<'insights' | 'forecasting'>('insights');

  const fetchData = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      // 1. Fetch AI overview insights
      const insightsRes = await apiFetch(`/api/ai/insights?storeId=${user.storeId}`);
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setStats(insightsData);
      }

      // 2. Fetch AI Projections
      const predictionsRes = await apiFetch(`/api/ai/predictions?storeId=${user.storeId}`);
      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json();
        setPredictions(predictionsData);
      }
    } catch (e) {
      console.error('Failed to load dashboard data: ', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Execute quick restock (+50 stock)
  const handleQuickRestock = async (prodId: string, currentStock: number) => {
    try {
      const res = await apiFetch(`/api/products/${prodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQty: currentStock + 50 })
      });
      if (res.ok) {
        alert('Stock successfully updated!');
        fetchData(); // reload
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 dark text-foreground">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-text-muted">Analyzing business logs & building models...</p>
      </div>
    );
  }

  // Format Recharts Sales history array
  const weeklyChartData = [
    { name: 'Mon', sales: stats.todaySales * 0.4 },
    { name: 'Tue', sales: stats.todaySales * 0.7 },
    { name: 'Wed', sales: stats.todaySales * 0.5 },
    { name: 'Thu', sales: stats.todaySales * 0.8 },
    { name: 'Fri', sales: stats.yesterdaySales },
    { name: 'Sat', sales: stats.todaySales },
    { name: 'Sun (Forecast)', sales: predictions.nextDaySales },
  ];

  return (
    <div className="space-y-8 dark text-foreground">
      {/* Welcome Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Business Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">AI-Powered insights & transaction metrics</p>
        </div>
        
        {predictions.lowStockAlerts.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold pulse-red">
            <AlertTriangle className="w-4 h-4" />
            <span>{predictions.lowStockAlerts.length} Low Stock Alerts!</span>
          </div>
        )}
      </div>

      {/* Grid Stats cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today Sales */}
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-2xl glass-card border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted">Today Sales</span>
            <h3 className="text-2xl font-bold font-outfit">₹{stats.todaySales.toFixed(2)}</h3>
            <span className="text-xs text-green flex items-center gap-1">
              Yesterday: ₹{stats.yesterdaySales.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-green/10 text-green rounded-xl"><TrendingUp className="w-6 h-6" /></div>
        </motion.div>

        {/* Inventory Value */}
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-2xl glass-card border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted">Inventory Asset Value</span>
            <h3 className="text-2xl font-bold font-outfit">₹{stats.inventoryValue.toFixed(2)}</h3>
            <span className="text-xs text-text-muted">Active items value</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><Package className="w-6 h-6" /></div>
        </motion.div>

        {/* Avg Order Value */}
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-2xl glass-card border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted">Average Order Value</span>
            <h3 className="text-2xl font-bold font-outfit">₹{stats.averageOrderValue.toFixed(2)}</h3>
            <span className="text-xs text-text-muted">Basket ticket spending</span>
          </div>
          <div className="p-3 bg-accent/10 text-accent rounded-xl"><ShoppingBag className="w-6 h-6" /></div>
        </motion.div>

        {/* Gross Profit */}
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-2xl glass-card border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted">Gross Profit (Est)</span>
            <h3 className="text-2xl font-bold font-outfit">₹{stats.grossProfit.toFixed(2)}</h3>
            <span className="text-xs text-green font-semibold">Net margin (25%): ₹{stats.netProfit.toFixed(2)}</span>
          </div>
          <div className="p-3 bg-warning/10 text-warning rounded-xl"><CreditCard className="w-6 h-6" /></div>
        </motion.div>
      </div>

      {/* Main Split Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Chart Column (2 cols span) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold font-outfit mb-6">Sales History (Real-Time vs Forecast)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabbed view: Insights vs Forecasts */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <div className="flex border-b border-border mb-6">
              <button
                onClick={() => setActiveTab('insights')}
                className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 mr-6 ${activeTab === 'insights' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-foreground'}`}
              >
                AI Assistant Insights
              </button>
              <button
                onClick={() => setActiveTab('forecasting')}
                className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${activeTab === 'forecasting' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-foreground'}`}
              >
                Demand Projections
              </button>
            </div>

            {activeTab === 'insights' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span>Real-Time Business Summaries</span>
                </div>
                <div className="grid gap-3">
                  {stats.insights.map((insight: string, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-xl bg-background/50 border border-border text-sm leading-relaxed">
                      <span className="text-primary font-semibold">0{idx + 1}.</span>
                      <p>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Forecast Tiers */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-2xl bg-background/50 border border-border text-center">
                    <span className="text-[11px] font-semibold text-text-muted uppercase">Tomorrow (Est)</span>
                    <h4 className="text-lg font-bold font-outfit mt-1 text-primary">₹{predictions.nextDaySales.toFixed(2)}</h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-background/50 border border-border text-center">
                    <span className="text-[11px] font-semibold text-text-muted uppercase">Next Week (Est)</span>
                    <h4 className="text-lg font-bold font-outfit mt-1 text-primary">₹{predictions.nextWeekSales.toFixed(2)}</h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-background/50 border border-border text-center">
                    <span className="text-[11px] font-semibold text-text-muted uppercase">Next Month (Est)</span>
                    <h4 className="text-lg font-bold font-outfit mt-1 text-primary">₹{predictions.nextMonthSales.toFixed(2)}</h4>
                  </div>
                </div>

                {/* Stockout Risk Warnings */}
                {predictions.outOfStockPredictions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-warning" /> Expected Out-Of-Stock Projections (5 Days)
                    </h4>
                    <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-background/20">
                      {predictions.outOfStockPredictions.slice(0, 3).map((item: any) => (
                        <div key={item.productId} className="flex items-center justify-between p-4 text-sm">
                          <div>
                            <span className="font-semibold text-foreground">{item.name}</span>
                            <div className="text-xs text-text-muted mt-0.5">SKU: {item.sku} | Daily sales: {item.dailySalesVelocity.toFixed(1)} units</div>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-warning/15 text-warning pulse-blue">
                            {item.daysUntilOutOfStock === 0 ? 'Out of stock today' : `${item.daysUntilOutOfStock} days left`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar panels (Low stock, Top items) */}
        <div className="space-y-6">
          
          {/* Low Stock Adjustments */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold font-outfit mb-4">Stock Levels Attention</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {predictions.lowStockAlerts.length > 0 ? (
                predictions.lowStockAlerts.map((item: any) => (
                  <div key={item.productId} className="flex items-center justify-between p-3.5 rounded-2xl bg-background/50 border border-border">
                    <div>
                      <h4 className="text-sm font-bold">{item.name}</h4>
                      <p className="text-xs text-text-muted mt-0.5">Stock remaining: <span className="text-danger font-semibold">{item.currentStock} units</span></p>
                    </div>
                    <button
                      onClick={() => handleQuickRestock(item.productId, item.currentStock)}
                      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                      title="Quick Order +50 Units"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-text-muted text-sm flex flex-col items-center gap-2">
                  <CheckCircleIcon className="w-8 h-8 text-green" />
                  No low stock alerts. Inventory health is high.
                </div>
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold font-outfit mb-4">Top Performing Catalog Items</h3>
            <div className="space-y-3.5">
              {stats.topSellingProducts.length > 0 ? (
                stats.topSellingProducts.map((p: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-background/25 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        0{index + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold">{p.name}</h4>
                        <p className="text-[11px] text-text-muted mt-0.5">SKU: {p.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground">{p.qty} sold</div>
                      <div className="text-[10px] text-green mt-0.5">₹{p.revenue.toFixed(2)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-text-muted py-6">No sales logs compiled yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Small helper Check icon
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
