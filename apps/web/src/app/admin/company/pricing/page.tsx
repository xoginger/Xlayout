"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, ProductPrice } from '@/store/admin-catalog-store';

export default function CompanyPricingPage() {
  const { prices, products, fetchPrices, fetchProducts, createProductPrice, updatePriceStatus, isLoading } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ProductPrice>>({
    productId: '',
    currency: 'USD',
    basePrice: '',
    validFrom: '',
    validTo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPrices();
    fetchProducts();
  }, [fetchPrices, fetchProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.basePrice) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<ProductPrice> = { 
        currency: formData.currency, 
        basePrice: parseFloat(formData.basePrice.toString()),
      };
      
      if (formData.validFrom) payload.validFrom = new Date(formData.validFrom).toISOString();
      if (formData.validTo) payload.validTo = new Date(formData.validTo).toISOString();

      await createProductPrice(formData.productId, payload);
      setIsModalOpen(false);
      setFormData({ productId: '', currency: 'USD', basePrice: '', validFrom: '', validTo: '' });
      fetchPrices();
    } catch (err) {
      alert('Error creating price mapping for product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await updatePriceStatus(id, !currentStatus);
    } catch (err) {
      alert('Error updating price status');
    }
  };

  const columns = [
    { 
      header: 'Product', 
      accessor: (p: ProductPrice & { product?: any }) => (
        <div>
          <span className="font-semibold block text-slate-900">{p.product?.name || p.productId}</span>
          <span className="text-xs text-slate-500">SKU: {p.product?.sku || 'N/A'}</span>
        </div>
      )
    },
    { 
      header: 'Price', 
      accessor: (p: ProductPrice) => (
        <span className="font-bold text-slate-800">
          {Number(p.basePrice).toLocaleString('en-US', { style: 'currency', currency: p.currency })} <span className="text-xs text-slate-500 font-normal">{p.currency}</span>
        </span>
      ) 
    },
    { 
      header: 'Validity', 
      accessor: (p: ProductPrice) => (
        <div className="text-xs">
          {p.validFrom || p.validTo ? (
            <>
              <div className="text-green-600">From: {p.validFrom ? new Date(p.validFrom).toLocaleDateString() : 'Always'}</div>
              <div className="text-red-500">To: {p.validTo ? new Date(p.validTo).toLocaleDateString() : 'Forever'}</div>
            </>
          ) : (
             <span className="text-slate-400 italic">No time limit</span>
          )}
        </div>
      )
    },
    { header: 'Status', accessor: (p: ProductPrice) => <StatusBadge status={p.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { 
      header: 'Actions', 
      accessor: (p: ProductPrice) => (
        <AdminButton 
          variant={p.active ? "outline" : "primary"} 
          size="sm" 
          onClick={() => handleStatusToggle(p.id, p.active)}
        >
          {p.active ? 'Disable' : 'Enable'}
        </AdminButton>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Pricing Engine">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Product Price Lists</h2>
          <p className="text-sm text-slate-500">Set base prices and operational valid dates for all catalog products.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}>
          Add Price
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={prices} 
        loading={isLoading}
        emptyMessage="No prices configured yet. Add base prices for your catalog."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Map Price to Product"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Save Price</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Product</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.productId || ''}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              <option value="">Select Product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1">A product can have multiple prices active at different dates.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Price</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">$</span>
                </div>
                <input 
                  type="number" step="0.01" required
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                  placeholder="0.00"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Mexican Peso</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid From (Optional)</label>
              <input 
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                value={formData.validFrom || ''}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid To (Optional)</label>
              <input 
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                value={formData.validTo || ''}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
