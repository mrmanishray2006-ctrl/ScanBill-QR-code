'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import {
  ShoppingBag, LayoutDashboard, Package, Boxes, QrCode, BarChart3,
  CreditCard, Settings, Home, ScanLine, ShoppingCart, History, LogOut, Sun, Moon, Users, Award
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const pathname = usePathname();

  if (!user) return null;

  const totalCartItems = cart.reduce((s, item) => s + item.quantity, 0);

  const getLinkClass = (path: string) => {
    const base = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ";
    const active = "bg-primary text-white shadow-lg shadow-primary/25";
    const inactive = "text-text-muted hover:bg-surface-light dark:hover:bg-white/5 hover:text-foreground";
    return pathname.startsWith(path) ? `${base} ${active}` : `${base} ${inactive}`;
  };

  const renderOwnerLinks = () => (
    <>
      <Link href="/owner/dashboard" className={getLinkClass('/owner/dashboard')}>
        <LayoutDashboard className="w-4 h-4" /> <span className="hidden md:inline">Dashboard</span>
      </Link>
      <Link href="/owner/products" className={getLinkClass('/owner/products')}>
        <Package className="w-4 h-4" /> <span className="hidden md:inline">Products</span>
      </Link>
      <Link href="/owner/inventory" className={getLinkClass('/owner/inventory')}>
        <Boxes className="w-4 h-4" /> <span className="hidden md:inline">Inventory</span>
      </Link>
      <Link href="/owner/reports" className={getLinkClass('/owner/reports')}>
        <BarChart3 className="w-4 h-4" /> <span className="hidden md:inline">Reports</span>
      </Link>
      <Link href="/owner/employees" className={getLinkClass('/owner/employees')}>
        <Users className="w-4 h-4" /> <span className="hidden md:inline">Employees</span>
      </Link>
      <Link href="/owner/subscription" className={getLinkClass('/owner/subscription')}>
        <CreditCard className="w-4 h-4" /> <span className="hidden md:inline">Subscription</span>
      </Link>
      <Link href="/owner/settings" className={getLinkClass('/owner/settings')}>
        <Settings className="w-4 h-4" /> <span className="hidden md:inline">Settings</span>
      </Link>
    </>
  );

  const renderCustomerLinks = () => (
    <>
      <Link href="/customer/home" className={getLinkClass('/customer/home')}>
        <Home className="w-4 h-4" /> <span className="hidden md:inline">Home</span>
      </Link>
      <Link href="/customer/scanner" className={getLinkClass('/customer/scanner')}>
        <ScanLine className="w-4 h-4" /> <span className="hidden md:inline">Scan Code</span>
      </Link>
      <Link href="/customer/cart" className={getLinkClass('/customer/cart')}>
        <div className="relative">
          <ShoppingCart className="w-4 h-4" />
          {totalCartItems > 0 && (
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-accent text-white rounded-full">
              {totalCartItems}
            </span>
          )}
        </div>
        <span className="hidden md:inline">Cart</span>
      </Link>
      <Link href="/customer/loyalty" className={getLinkClass('/customer/loyalty')}>
        <Award className="w-4 h-4" /> <span className="hidden md:inline">Rewards</span>
      </Link>
      <Link href="/customer/history" className={getLinkClass('/customer/history')}>
        <History className="w-4 h-4" /> <span className="hidden md:inline">History</span>
      </Link>
    </>
  );

  return (
    <>
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg font-outfit text-primary">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <span>QuickStore</span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {user.role === 'CUSTOMER' ? renderCustomerLinks() : renderOwnerLinks()}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-muted hover:bg-surface-light dark:hover:bg-white/5"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* User Profile Tag */}
            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold bg-surface-light dark:bg-white/5 border border-border">
              {user.name} ({user.role})
            </span>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 font-semibold"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Features 19 UI compliance) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/95 backdrop-blur-md pb-safe">
        <div className="flex items-center justify-around h-full px-2">
          {user.role === 'CUSTOMER' ? (
            <>
              <Link href="/customer/home" className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${pathname.startsWith('/customer/home') ? 'text-primary' : 'text-text-muted'}`}>
                <Home className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Home</span>
              </Link>
              <Link href="/customer/scanner" className="flex flex-col items-center justify-center w-14 h-14 -mt-5 bg-primary text-white rounded-full shadow-lg shadow-primary/45 border-4 border-background">
                <ScanLine className="w-6 h-6" />
              </Link>
              <Link href="/customer/cart" className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${pathname.startsWith('/customer/cart') ? 'text-primary' : 'text-text-muted'}`}>
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {totalCartItems > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 text-[8px] font-bold bg-accent text-white rounded-full">
                      {totalCartItems}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5">Cart</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/owner/dashboard" className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${pathname.startsWith('/owner/dashboard') ? 'text-primary' : 'text-text-muted'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Dashboard</span>
              </Link>
              <Link href="/owner/products" className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${pathname.startsWith('/owner/products') ? 'text-primary' : 'text-text-muted'}`}>
                <Package className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Products</span>
              </Link>
              <Link href="/owner/inventory" className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${pathname.startsWith('/owner/inventory') ? 'text-primary' : 'text-text-muted'}`}>
                <Boxes className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Stock</span>
              </Link>
              <Link href="/owner/reports" className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${pathname.startsWith('/owner/reports') ? 'text-primary' : 'text-text-muted'}`}>
                <BarChart3 className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Reports</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
};
