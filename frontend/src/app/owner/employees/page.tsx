'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Users, Plus, X, ShieldAlert, Award, Clock } from 'lucide-react';

export default function EmployeesRoster() {
  const { user, apiFetch } = useAuth();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [performances, setPerformances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['CASHIER_BILLING']);

  const permissionOptions = [
    { key: 'CASHIER_BILLING', label: 'Create checkout bills' },
    { key: 'EDIT_CATALOG', label: 'Modify product prices' },
    { key: 'MANAGE_EMPLOYEES', label: 'View employee roster' },
    { key: 'VIEW_REPORTS', label: 'Access ledger logs' }
  ];

  const fetchEmployees = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      // 1. Fetch employees list
      const rosterRes = await apiFetch('/api/employees');
      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        setEmployees(rosterData);
      }

      // 2. Fetch performance analytics
      const perfRes = await apiFetch('/api/employees/performance');
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setPerformances(perfData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name, email, password, role,
      permissions: selectedPermissions
    };

    try {
      const res = await apiFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchEmployees();
        alert('Employee added successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add employee.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await apiFetch(`/api/employees/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchEmployees();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Staff Management</h1>
          <p className="text-sm text-text-muted mt-1">Assign duties, audit shift logs, and monitor checkout volumes</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roster list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold font-outfit mb-4">Store Roster</h3>
            {loading ? (
              <div className="text-center py-6 text-text-muted">Loading employee database...</div>
            ) : employees.length > 0 ? (
              <div className="divide-y divide-border/40">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-4">
                    <div>
                      <h4 className="font-semibold">{emp.user?.name}</h4>
                      <p className="text-xs text-text-muted mt-0.5">{emp.user?.email} | Role: <span className="font-bold text-primary">{emp.role}</span></p>
                      
                      {/* Permissions badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {emp.permissions.map((perm: string) => (
                          <span key={perm} className="px-2 py-0.5 rounded bg-surface-light dark:bg-white/5 border border-border text-[9px] font-bold uppercase tracking-wider text-text-muted">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {emp.role !== 'OWNER' && (
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-danger/20 text-danger hover:bg-danger/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-text-muted">No staff added yet.</div>
            )}
          </div>
        </div>

        {/* Scorecard Column */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold font-outfit mb-4">Sales Performance scorecard</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4 text-text-muted">Calculating contributions...</div>
              ) : performances.length > 0 ? (
                performances.map((perf) => (
                  <div key={perf.employeeId} className="p-4 rounded-2xl bg-background/50 border border-border flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{perf.name}</h4>
                      <span className="text-[10px] text-text-muted tracking-wider uppercase font-bold">{perf.role}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{perf.transactionsCount} checkout invoices</div>
                      <div className="text-xs text-green font-semibold mt-0.5">₹{perf.totalSalesGenerated.toFixed(2)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-text-muted">No cashier sales recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Register employee */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-xl font-bold font-outfit">Add Store Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Employee Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Amit Kumar" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Login Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amit@store.com" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm"
                >
                  <option value="MANAGER">Store Manager</option>
                  <option value="CASHIER">Cashier Agent</option>
                  <option value="STAFF">General Staff</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase block">Set Access Permissions</label>
                <div className="grid gap-2 text-xs">
                  {permissionOptions.map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-border">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(opt.key)}
                        onChange={() => handleTogglePermission(opt.key)}
                        className="rounded accent-primary"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl border border-border hover:bg-surface-light dark:hover:bg-white/5 text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-dark">Register Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
