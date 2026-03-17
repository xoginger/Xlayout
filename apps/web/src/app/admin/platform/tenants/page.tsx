"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { usePlatformStore, Tenant } from '@/store/admin-platform-store';

export default function PlatformTenantsPage() {
  const { tenants, fetchTenants, createTenant, suspendTenant, activateTenant, isLoading } = usePlatformStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ 
    name: '', slug: '', 
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTenant(newTenant);
      setIsModalOpen(false);
      setNewTenant({ name: '', slug: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' });
    } catch (err: any) {
      alert(err.message || 'Error creating tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Company Name', accessor: 'name' as const },
    { header: 'Slug', accessor: 'slug' as const },
    { header: 'Status', accessor: (t: Tenant) => <StatusBadge status={t.status} /> },
    { header: 'Created', accessor: (t: Tenant) => new Date(t.createdAt).toLocaleDateString() },
    { 
      header: 'Actions', 
      accessor: (t: Tenant) => (
        <div className="flex gap-2">
          {t.status === 'ACTIVE' ? (
            <AdminButton variant="outline" size="sm" onClick={() => suspendTenant(t.id)}>Suspend</AdminButton>
          ) : (
            <AdminButton variant="primary" size="sm" onClick={() => activateTenant(t.id)}>Activate</AdminButton>
          )}
        </div>
      ) 
    },
  ];

  return (
    <AdminLayout type="platform" title="Tenants Management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Registered Companies</h2>
          <p className="text-sm text-slate-500">Manage all registered tenants and their operational status.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          Add New Tenant
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={tenants} 
        loading={isLoading}
        emptyMessage="No tenants found. Start by adding one!"
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Register New Tenant"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Register Company</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="border-b border-slate-200 pb-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Company Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g. Herman Miller"
                  value={newTenant.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewTenant({ ...newTenant, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Slug (URL identifier)</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500" 
                  placeholder="e.g. herman-miller"
                  value={newTenant.slug}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Initial Tenant Admin</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={newTenant.adminFirstName}
                  onChange={(e) => setNewTenant({ ...newTenant, adminFirstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={newTenant.adminLastName}
                  onChange={(e) => setNewTenant({ ...newTenant, adminLastName: e.target.value })}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
              <input 
                type="email" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                value={newTenant.adminEmail}
                onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Password</label>
              <input 
                type="password" required minLength={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                value={newTenant.adminPassword}
                onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
              />
            </div>
          </div>
          
          {/* Hidden submit to allow enter to submit */}
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
