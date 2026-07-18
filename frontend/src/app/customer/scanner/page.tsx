'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useScanner } from '../../../hooks/useScanner';
import { ArrowLeft, Scan, RefreshCw, AlertCircle } from 'lucide-react';
import { getOfflineProducts, saveOfflineProducts } from '../../../utils/indexedDB';

export default function CustomerScanner() {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const { addToCart, isOnline } = useCart();
  
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch active products to configure simulation dropdown
  const loadSimulatorCatalog = async () => {
    setLoading(true);
    // If offline, fetch from IndexedDB cache
    if (!isOnline) {
      const cached = await getOfflineProducts();
      setProductsList(cached);
      if (cached.length > 0) setSelectedSku(cached[0].sku);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch(`/api/products?storeId=${user?.storeId || ''}&status=active`);
      if (res.ok) {
        const data = await res.json();
        setProductsList(data.products);
        if (data.products.length > 0) setSelectedSku(data.products[0].sku);
        
        // Cache products catalog for offline use (Feature 16)
        await saveOfflineProducts(data.products);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSimulatorCatalog();
  }, [user, isOnline]);

  const handleScanResult = (qrText: string) => {
    try {
      const payload = JSON.parse(qrText);
      if (payload.v === 1 && payload.sku) {
        // Resolve item addition
        triggerAddToCart(payload.sku);
      }
    } catch (e) {
      console.warn('Non-product QR code text scanned: ', qrText);
    }
  };

  const { isActive, errorMsg, startScanner, stopScanner } = useScanner({
    elementId: 'camera-stream-box',
    onScanSuccess: handleScanResult
  });

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const triggerAddToCart = (sku: string) => {
    const item = productsList.find(p => p.sku === sku);
    if (!item) {
      alert('Scanned product was not found in this store catalog.');
      return;
    }

    if (item.stockQty <= 0) {
      alert(`Out of stock! ${item.name} is currently unavailable.`);
      return;
    }

    addToCart(item);
    router.push('/customer/cart');
  };

  const handleSimulateScan = () => {
    if (!selectedSku) return;
    triggerAddToCart(selectedSku);
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button onClick={() => router.push('/customer/home')} className="p-2 rounded-xl bg-surface-light dark:bg-white/5 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-outfit">Quick Scan</h2>
        <div className="w-9 h-9"></div> {/* spacer */}
      </div>

      {/* Camera box */}
      <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-3xl border border-border bg-black/60 shadow-xl">
        <div id="camera-stream-box" className="w-full h-full"></div>
        
        {/* Alignment bracket overlays */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
          <div className="w-full h-full border-2 border-dashed border-accent/40 rounded-2xl relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg"></div>
            <div className="laser-line"></div>
          </div>
        </div>

        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 gap-3">
            <AlertCircle className="w-8 h-8 text-warning" />
            <p className="text-xs text-text-muted">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Simulator tool fallback */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 shadow-lg space-y-4">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Demo Testing Simulator</h4>
        
        {loading ? (
          <div className="text-xs text-text-muted">Loading items list...</div>
        ) : productsList.length > 0 ? (
          <div className="flex gap-3">
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs"
            >
              {productsList.map(p => (
                <option key={p.id} value={p.sku}>
                  {p.name} (₹{p.price})
                </option>
              ))}
            </select>
            <button
              onClick={handleSimulateScan}
              className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-xs shadow-md hover:bg-accent-dark transition-colors"
            >
              Simulate Scan
            </button>
          </div>
        ) : (
          <p className="text-xs text-text-muted">No items in store catalogue to simulate.</p>
        )}
      </div>
    </div>
  );
}
