"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminAccessStore, CatalogAccess } from '@/store/admin-access-store';
import { useAuthStore } from '@/store/auth-store';

export default function CompanyCatalogAccessPage() {
  const { catalogAccesses, fetchCatalogAccesses, grantCatalogAccess, revokeCatalogAccess, isLoading } = useAdminAccessStore();
  const { activeTenantId } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState<Partial<CatalogAccess>>({
    catalogEnabled: true,
    pricesEnabled: false,
    conditionsEnabled: false,
    validUntil: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTenantId) fetchCatalogAccesses(activeTenantId);
  }, [activeTenantId, fetchCatalogAccesses]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await grantCatalogAccess(email, {
        catalogEnabled: formData.catalogEnabled,
        pricesEnabled: formData.pricesEnabled,
        conditionsEnabled: formData.conditionsEnabled,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined
      });
      setIsModalOpen(false);
      setEmail('');
      setFormData({ catalogEnabled: true, pricesEnabled: false, conditionsEnabled: false, validUntil: '' });
      if (activeTenantId) fetchCatalogAccesses(activeTenantId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error granting catalog access. Make sure the user is registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (endUserId: string, name: string) => {
    if (!activeTenantId) return;
    if (confirm(`Are you sure you want to revoke access for ${name}?`)) {
      try {
        await revokeCatalogAccess(activeTenantId, endUserId);
      } catch (err) {
        alert('Error revoking access');
      }
    }
  };

  const columns = [
    { 
      header: 'End User', 
      accessor: (a: CatalogAccess) => (
        <div>
          <span className="font-semibold block text-slate-900">{a.endUser?.firstName} {a.endUser?.lastName}</span>
          <span className="text-xs text-slate-500">{a.endUser?.email}</span>
          {a.endUser?.profession && <span className="text-[10px] ml-2 uppercase text-slate-400 font-bold tracking-wider">{a.endUser.profession}</span>}
        </div>
      )
    },
    { 
      header: 'Permissions', 
      accessor: (a: CatalogAccess) => (
        <div className="flex gap-2 text-xs">
          {a.catalogEnabled && <span className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">Catalog</span>}
          {a.pricesEnabled && <span className="text-green-600 bg-green-50 px-1 rounded border border-green-200">Prices</span>}
          {a.conditionsEnabled && <span className="text-purple-600 bg-purple-50 px-1 rounded border border-purple-200">Conditions</span>}
        </div>
      ) 
    },
    { 
      header: 'Source', 
      accessor: (a: CatalogAccess) => (
        <span className="text-xs bg-slate-100 px-2 py-1 rounded">
          {a.activationCodeId ? 'Activation Code' : 'Direct Assignment'}
        </span>
      ) 
    },
    { 
      header: 'Expires', 
      accessor: (a: CatalogAccess) => (
        <span className="text-sm">
          {a.validUntil ? new Date(a.validUntil).toLocaleDateString() : 'Never'}
        </span>
      ) 
    },
    { 
      header: 'Actions', 
      accessor: (a: CatalogAccess) => (
        <AdminButton 
          variant="ghost" 
          size="sm" 
          onClick={() => handleRevoke(a.endUserId, a.endUser?.email)}
          icon={<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>}
        >
          Revoke
        </AdminButton>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Direct Catalog Assignments">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assigned Professionals</h2>
          <p className="text-sm text-slate-500">View and manage architects or distributors who have unlocked your catalog.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>}>
          Grant Access
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={catalogAccesses} 
        loading={isLoading}
        emptyMessage="No direct access granted yet."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Direct Access Assignment"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleGrant} loading={isSubmitting}>Grant Access</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleGrant} className="space-y-4">
          <p className="text-sm text-slate-500 mb-4 tracking-tight">Assign catalog visibility to an existing platform user by their email address.</p>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">User Email Address</label>
            <input 
              type="email" required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              placeholder="architect@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <label className="block text-sm font-semibold text-slate-800 mb-3">Permissions</label>
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
                <span className="text-sm text-slate-700">Show specific prices for this user</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={formData.conditionsEnabled} 
                  onChange={(e) => setFormData({ ...formData, conditionsEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-slate-700">Show commercial terms</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until (Optional)</label>
            <input 
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              value={formData.validUntil || ''}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            />
          </div>

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
