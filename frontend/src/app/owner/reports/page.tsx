'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Download, Calendar, Search } from 'lucide-react';

export default function SalesReports() {
  const { user, apiFetch } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Totals metrics
  const [grossSales, setGrossSales] = useState(0);
  const [taxCollected, setTaxCollected] = useState(0);
  const [discountsAwarded, setDiscountsAwarded] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  // Filter parameters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchReports = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      const url = `/api/orders?storeId=${user.storeId}&start=${startDate}&end=${endDate}&status=${status}&search=${encodeURIComponent(search)}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        calculateMetrics(data.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Default: past 30 days
    const today = new Date();
    const pastMonth = new Date();
    pastMonth.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(pastMonth.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [user, startDate, endDate, status, search]);

  const calculateMetrics = (orderList: any[]) => {
    const paidOrders = orderList.filter(o => o.paymentStatus === 'PAID');
    
    const gross = paidOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const tax = paidOrders.reduce((sum, o) => sum + o.tax, 0);
    const disc = paidOrders.reduce((sum, o) => sum + o.discount, 0);

    setGrossSales(gross);
    setTaxCollected(tax);
    setDiscountsAwarded(disc);
    setOrdersCount(paidOrders.length);
  };

  // Compile data for Recharts Bar Chart
  const compileChartData = () => {
    const dailyMap: { [date: string]: number } = {};
    orders.filter(o => o.paymentStatus === 'PAID').forEach(o => {
      const dateStr = new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + o.total;
    });

    return Object.keys(dailyMap).map(date => ({
      date,
      revenue: dailyMap[date]
    }));
  };

  // Export orders ledger to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('No invoice data available to export.');
      return;
    }

    let csv = 'Invoice Number,Timestamp,Customer Name,Customer Email,Payment Method,Subtotal,Tax,Discount,Total Paid,Tx Reference,Status\n';
    orders.forEach(o => {
      csv += `"${o.invoiceNumber}","${o.createdAt}","${o.customerName}","${o.customerEmail}","${o.paymentMethod}",${o.subtotal},${o.tax},${o.discount},${o.total},"${o.txRef || ''}","${o.paymentStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `QuickStore_Sales_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Ledger Reports</h1>
          <p className="text-sm text-text-muted mt-1">Export transaction logs and analyze category distributions</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
        >
          <Download className="w-4 h-4" /> Export CSV Ledger
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 rounded-2xl bg-surface-card border border-border">
          <span className="text-xs font-semibold text-text-muted">Gross Sales (Paid)</span>
          <h4 className="text-xl font-bold font-outfit text-foreground mt-1">₹{grossSales.toFixed(2)}</h4>
        </div>
        <div className="p-5 rounded-2xl bg-surface-card border border-border">
          <span className="text-xs font-semibold text-text-muted">Tax Collected</span>
          <h4 className="text-xl font-bold font-outfit text-primary mt-1">₹{taxCollected.toFixed(2)}</h4>
        </div>
        <div className="p-5 rounded-2xl bg-surface-card border border-border">
          <span className="text-xs font-semibold text-text-muted">Discounts Awarded</span>
          <h4 className="text-xl font-bold font-outfit text-warning mt-1">-₹{discountsAwarded.toFixed(2)}</h4>
        </div>
        <div className="p-5 rounded-2xl bg-surface-card border border-border">
          <span className="text-xs font-semibold text-text-muted">Total Paid Orders</span>
          <h4 className="text-xl font-bold font-outfit text-green mt-1">{ordersCount} Invoices</h4>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ledger table column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-outfit">Transaction Ledger</h3>
              
              <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-2 py-1.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-text-muted text-sm">Querying databases...</div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border font-bold text-text-muted uppercase tracking-wider">
                      <th className="pb-3">Invoice Code</th>
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Customer details</th>
                      <th className="pb-3">Total Paid</th>
                      <th className="pb-3">Tx Reference</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 font-semibold font-mono text-primary">{o.invoiceNumber}</td>
                        <td className="py-3 text-text-muted">{new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="py-3">
                          <div className="font-semibold">{o.customerName}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{o.customerEmail}</div>
                        </td>
                        <td className="py-3 font-bold">₹{o.total.toFixed(2)}</td>
                        <td className="py-3 font-mono text-text-muted">{o.txRef || '—'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.paymentStatus === 'PAID' ? 'bg-green/10 text-green' : o.paymentStatus === 'PENDING' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-text-muted">No transactions logged in this range.</div>
            )}
          </div>
        </div>

        {/* Charts column */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold font-outfit mb-6">Financial Trends</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compileChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 9 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
