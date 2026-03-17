"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminAccessStore, ActivationCode } from '@/store/admin-access-store';
import { useAuthStore } from '@/store/auth-store';

export default function CompanyActivationCodesPage() {
  const { activationCodes, fetchActivationCodes, createActivationCode, deactivateCode, isLoading } = useAdminAccessStore();
  const { activeTenantId } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ActivationCode>>({
    catalogEnabled: true,
    pricesEnabled: false,
    conditionsEnabled: false,
    maxUses: undefined,
    expiresAt: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTenantId) fetchActivationCodes(activeTenantId);
  }, [activeTenantId, fetchActivationCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createActivationCode({
        ...formData,
        maxUses: formData.maxUses ? parseInt(formData.maxUses.toString(), 10) : undefined,
        expiresAt: formData.expiresAt ? formData.expiresAt : undefined
      });
      setIsModalOpen(false);
      setFormData({ catalogEnabled: true, pricesEnabled: false, conditionsEnabled: false, maxUses: undefined, expiresAt: '' });
      if (activeTenantId) fetchActivationCodes(activeTenantId);
    } catch (err) {
      alert('Error creating activation code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to deactivate code ${code}? This cannot be undone.`)) {
      try {
        await deactivateCode(id);
      } catch (err) {
        alert('Error deactivating code');
      }
    }
  };

  const columns = [
    { 
      header: 'Access Code', 
      accessor: (c: ActivationCode) => (
        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-sm text-slate-800 tracking-wider font-semibold">
          {c.code}
        </span>
      ) 
    },
    { 
      header: 'Permissions', 
      accessor: (c: ActivationCode) => (
        <div className="flex gap-2 text-xs">
          {c.catalogEnabled && <span className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">Catalog</span>}
          {c.pricesEnabled && <span className="text-green-600 bg-green-50 px-1 rounded border border-green-200">Prices</span>}
          {c.conditionsEnabled && <span className="text-purple-600 bg-purple-50 px-1 rounded border border-purple-200">Conditions</span>}
        </div>
      ) 
    },
    { 
      header: 'Usage Limit', 
      accessor: (c: ActivationCode) => (
        <div className="text-sm">
          <span>{c.usedCount} / {c.maxUses || '∞'}</span>
        </div>
      ) 
    },
    { 
      header: 'Expires', 
      accessor: (c: ActivationCode) => (
        <span className="text-sm">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
        </span>
      ) 
    },
    { header: 'Status', accessor: (c: ActivationCode) => <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { 
      header: 'Actions', 
      accessor: (c: ActivationCode) => (
        <AdminButton 
          variant="ghost" 
          size="sm" 
          disabled={!c.active}
          onClick={() => handleDeactivate(c.id, c.code)}
          icon={<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"/></svg>}
        >
          Revoke
        </AdminButton>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Activation Codes">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Distributor Access Codes</h2>
          <p className="text-sm text-slate-500">Generate secure tokens for distributors and end-users to unlock your catalog.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>}>
          Generate Code
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={activationCodes} 
        loading={isLoading}
        emptyMessage="No activation codes created. Generate one to invite users to your catalog."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Generate Activation Code"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Create Token</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-slate-500 mb-4 tracking-tight">The platform will automatically generate a secure 12-character alphanumeric code upon creation.</p>
          
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <label className="block text-sm font-semibold text-slate-800 mb-3">Include Permissions</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={formData.catalogEnabled} 
                  onChange={(e) => setFormData({ ...formData, catalogEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-slate-700">Catalog Access (Required)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={formData.pricesEnabled} 
                  onChange={(e) => setFormData({ ...formData, pricesEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-slate-700">Pricing visibility</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={formData.conditionsEnabled} 
                  onChange={(e) => setFormData({ ...formData, conditionsEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-slate-700">Commercial terms & conditions visibility</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Redemptions</label>
              <input 
                type="number" min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                placeholder="Leave blank for infinite"
                value={formData.maxUses || ''}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
              <input 
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                value={formData.expiresAt || ''}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
