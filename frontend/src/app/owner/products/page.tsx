'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { generateQRCodeSVG } from '../../../utils/qr';
import { Package, Search, Plus, Edit, Eye, EyeOff, Trash2, X, Download, Tag } from 'lucide-react';
import jsPDF from 'jspdf';

export default function ProductsDirectory() {
  const { user, apiFetch } = useAuth();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [reorderPoint, setReorderPoint] = useState('10');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [gstPercent, setGstPercent] = useState('18');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [expiryDate, setExpiryDate] = useState('');

  const fetchCatalog = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      const url = `/api/products?storeId=${user.storeId}&search=${encodeURIComponent(search)}&category=${selectedCategory}&status=${selectedStatus}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [user, search, selectedCategory, selectedStatus]);

  const handleOpenAddModal = () => {
    setFormId('');
    setName('');
    setSku('');
    setCategory('');
    setPrice('');
    setStockQty('');
    setReorderPoint('10');
    setDescription('');
    setImageUrl('');
    setGstPercent('18');
    setDiscountPercent('0');
    setExpiryDate('');
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleOpenEditModal = (p: any) => {
    setFormId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setPrice(p.price.toString());
    setStockQty(p.stockQty.toString());
    setReorderPoint(p.reorderPoint.toString());
    setDescription(p.description || '');
    setImageUrl(p.imageUrl || '');
    setGstPercent(p.gstPercent.toString());
    setDiscountPercent(p.discountPercent.toString());
    setExpiryDate(p.expiryDate ? p.expiryDate.split('T')[0] : '');
    setSelectedProduct(p);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name, sku, category,
      price: parseFloat(price),
      stockQty: parseInt(stockQty),
      reorderPoint: parseInt(reorderPoint),
      description, imageUrl,
      gstPercent: parseFloat(gstPercent),
      discountPercent: parseFloat(discountPercent),
      expiryDate: expiryDate || null
    };

    try {
      let res;
      if (formId) {
        res = await apiFetch(`/api/products/${formId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowProductModal(false);
        fetchCatalog();
        alert('Product details successfully saved.');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save product details.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (p: any) => {
    try {
      const res = await apiFetch(`/api/products/${p.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive })
      });
      if (res.ok) fetchCatalog();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchCatalog();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePreviewQR = (p: any) => {
    setSelectedProduct(p);
    setShowQRModal(true);
  };

  // Download printable PDF tag for a single item (Offline compliant jsPDF)
  const downloadSinglePDF = (p: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    });

    const qrPayload = JSON.stringify({
      v: 1,
      sid: user?.storeId,
      pid: p.id,
      sku: p.sku
    });

    // Create a temporary canvas to draw the SVG QR and get PNG data
    const svgStr = generateQRCodeSVG(qrPayload);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 10, 10, 280, 280);
        const imgData = canvas.toDataURL('image/png');

        // Draw Card Border
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(1);
        doc.rect(5, 5, 95, 138);

        // Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Kumar Digital Mart', 52.5, 20, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, 26, 90, 26);

        // Render QR Image
        doc.addImage(imgData, 'PNG', 20, 32, 65, 65);

        // Detail texts
        doc.setFontSize(12);
        doc.text(p.name, 52.5, 108, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`SKU: ${p.sku}`, 52.5, 116, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(`Price: Rs. ${p.price.toFixed(2)}`, 52.5, 128, { align: 'center' });

        doc.save(`QR_${p.sku}.pdf`);
        URL.revokeObjectURL(url);
      }
    };
  };

  return (
    <div className="space-y-6 dark text-foreground">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Products Directory</h1>
          <p className="text-sm text-text-muted mt-1">Configure and manage your inventory catalog</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Filters bar */}
      <div className="p-4 rounded-2xl bg-surface-card border border-border flex flex-col md:flex-row gap-4 items-center shadow-md">
        <div className="relative flex-1 w-full flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 md:w-44 px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 md:w-44 px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Products catalog list grid */}
      {loading ? (
        <div className="text-center py-12 text-text-muted text-sm">Loading catalog directory...</div>
      ) : products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const lowStock = p.stockQty < p.reorderPoint;
            const qrPayload = JSON.stringify({ v: 1, sid: user?.storeId, pid: p.id, sku: p.sku });
            return (
              <div key={p.id} className={`flex flex-col justify-between p-5 rounded-2xl glass-card border border-white/5 shadow-lg ${!p.isActive ? 'opacity-60' : ''}`}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-light dark:bg-white/5 border border-border text-[10px] font-bold tracking-wide uppercase text-primary">
                      {p.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${lowStock ? 'bg-danger/10 text-danger' : 'bg-green/10 text-green'}`}>
                      Stock: {p.stockQty}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg font-outfit text-foreground leading-snug">{p.name}</h3>
                  <p className="text-xs text-text-muted font-mono mt-1">SKU: {p.sku}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xl font-bold font-outfit text-green">₹{p.price.toFixed(2)}</span>
                    <span className="text-[10px] text-text-muted">GST: {p.gstPercent}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6 border-t border-border/40 pt-4">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-xl bg-surface-light dark:bg-white/5 hover:bg-white/10 border border-border"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handlePreviewQR(p)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                    title="View QR Barcode"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(p)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-light dark:hover:bg-white/5"
                    title={p.isActive ? 'Disable product' : 'Enable product'}
                  >
                    {p.isActive ? <EyeOff className="w-4 h-4 text-warning" /> : <Eye className="w-4 h-4 text-green" />}
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-danger/20 text-danger hover:bg-danger/10"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-text-muted text-sm bg-surface-card border border-border rounded-2xl shadow-inner">
          No inventory products found matching the criteria.
        </div>
      )}

      {/* MODAL: Add / Edit product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl glass-card border border-white/5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-xl font-bold font-outfit">{formId ? 'Edit Catalog Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowProductModal(false)} className="p-1 rounded-lg text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Product Name *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Wireless Mouse" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">SKU / Barcode ID *</label>
                  <input type="text" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="MOUSE-WL-101" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Price (₹) *</label>
                  <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1499.00" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Stock Quantity *</label>
                  <input type="number" required value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="45" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Category *</label>
                  <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Electronics" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Reorder Alert Threshold</label>
                  <input type="number" required value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} placeholder="10" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">GST Tax (%)</label>
                  <input type="number" step="0.1" required value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} placeholder="18.0" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Discount (%)</label>
                  <input type="number" step="0.1" required value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="0.0" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Image URL</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/... (optional)" className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Expiry Date</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief details about item specs..." className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 focus:outline-none focus:border-primary text-sm" />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 rounded-xl border border-border hover:bg-surface-light dark:hover:bg-white/5 text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-dark">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR code preview */}
      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl glass-card border border-white/5 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-lg font-bold font-outfit">Product Tag QR</h3>
              <button onClick={() => setShowQRModal(false)} className="p-1 rounded-lg text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h2 className="text-xl font-bold font-outfit text-foreground">{selectedProduct.name}</h2>
            <p className="text-xs text-text-muted font-mono mt-1">SKU: {selectedProduct.sku}</p>
            <p className="text-lg font-extrabold text-green mt-2">Price: ₹{selectedProduct.price.toFixed(2)}</p>

            {/* Offline SVG QR injection */}
            <div 
              className="w-48 h-48 mx-auto my-6 p-3 bg-white rounded-2xl flex items-center justify-center shadow-inner"
              dangerouslySetInnerHTML={{
                __html: generateQRCodeSVG(JSON.stringify({ v: 1, sid: user?.storeId, pid: selectedProduct.id, sku: selectedProduct.sku }))
              }}
            />

            <button
              onClick={() => downloadSinglePDF(selectedProduct)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
            >
              <Download className="w-4 h-4" /> Download PDF Label
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
