"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, ProductCondition } from '@/store/admin-catalog-store';

export default function CompanyConditionsPage() {
  const { conditions, products, lines, fetchConditions, fetchProducts, fetchLines, createCondition, updateConditionStatus, isLoading } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Scopes are 'GLOBAL', 'LINE', or 'PRODUCT'
  const [scope, setScope] = useState<'GLOBAL' | 'LINE' | 'PRODUCT'>('GLOBAL');
  
  const [formData, setFormData] = useState<Partial<ProductCondition>>({
    conditionType: 'warranty',
    description: '',
    productId: '',
    lineId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConditions();
    fetchLines();
    fetchProducts();
  }, [fetchConditions, fetchProducts, fetchLines]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;
    setIsSubmitting(true);
    try {
      // Clean up fields based on scope
      const payload = { ...formData };
      if (scope === 'GLOBAL') {
        delete payload.productId;
        delete payload.lineId;
      } else if (scope === 'LINE') {
        delete payload.productId;
      } else if (scope === 'PRODUCT') {
        delete payload.lineId;
      }

      await createCondition(payload);
      setIsModalOpen(false);
      setFormData({ conditionType: 'warranty', description: '', productId: '', lineId: '' });
      fetchConditions();
    } catch (err) {
      alert('Error creating commercial condition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await updateConditionStatus(id, !currentStatus);
    } catch (err) {
      alert('Error updating condition status');
    }
  };

  const columns = [
    { 
      header: 'Scope', 
      accessor: (c: ProductCondition & { product?: any, line?: any }) => {
        if (c.productId) return <span className="font-semibold text-xs text-blue-600">Product: {c.product?.name || c.productId}</span>;
        if (c.lineId) return <span className="font-semibold text-xs text-purple-600">Line: {c.line?.name || c.lineId}</span>;
        return <span className="font-semibold text-xs text-slate-800 uppercase">Global Rules</span>;
      }
    },
    { 
      header: 'Type', 
      accessor: (c: ProductCondition) => (
        <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded font-semibold text-xs uppercase">{c.conditionType}</span>
      ) 
    },
    { header: 'Description', accessor: (c: ProductCondition) => <span className="text-sm truncate max-w-sm block" title={c.description}>{c.description}</span> },
    { header: 'Status', accessor: (c: ProductCondition) => <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { 
      header: 'Actions', 
      accessor: (c: ProductCondition) => (
        <AdminButton 
          variant={c.active ? "outline" : "primary"} 
          size="sm" 
          onClick={() => handleStatusToggle(c.id, c.active)}
        >
          {c.active ? 'Disable' : 'Enable'}
        </AdminButton>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Commercial Conditions">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Trading Terms & Warranties</h2>
          <p className="text-sm text-slate-500">Define global, line-specific, or individual product commercial constraints and warranties.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          Add Condition
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={conditions} 
        loading={isLoading}
        emptyMessage="No commercial conditions set up yet."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create Commercial Condition"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Save Condition</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition Scope</label>
            <div className="flex bg-slate-100 p-1 rounded-md mb-4">
               <button type="button" onClick={() => setScope('GLOBAL')} className={`flex-1 py-1 text-sm font-medium rounded ${scope === 'GLOBAL' ? 'bg-white shadow' : 'text-slate-500'}`}>Global</button>
               <button type="button" onClick={() => setScope('LINE')} className={`flex-1 py-1 text-sm font-medium rounded ${scope === 'LINE' ? 'bg-white shadow' : 'text-slate-500'}`}>Product Line</button>
               <button type="button" onClick={() => setScope('PRODUCT')} className={`flex-1 py-1 text-sm font-medium rounded ${scope === 'PRODUCT' ? 'bg-white shadow' : 'text-slate-500'}`}>Specific Product</button>
            </div>
          </div>

          {scope === 'LINE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Line</label>
              <select 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={formData.lineId || ''}
                onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
              >
                <option value="">Select Line...</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {scope === 'PRODUCT' && (
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
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition Type</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.conditionType}
              onChange={(e) => setFormData({ ...formData, conditionType: e.target.value as any })}
            >
              <option value="warranty">Warranty</option>
              <option value="delivery">Delivery Limits / Times</option>
              <option value="commercial">Commercial Requirement</option>
              <option value="custom">Custom Policy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              required
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              placeholder="e.g. 5-year warranty on mechanism. Lead time: 4-6 weeks."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
