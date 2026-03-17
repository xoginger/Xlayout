"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useCompanyStore, CompanyUser } from '@/store/admin-company-store';
import { useAuthStore } from '@/store/auth-store';

export default function CompanyUsersPage() {
  const { users, fetchUsers, createUser, updateUserStatus, isLoading } = useCompanyStore();
  const { activeTenantId } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
    firstName: '', 
    lastName: '', 
    role: 'CATALOG_MANAGER' as CompanyUser['role'] 
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId) return alert('No active tenant context.');
    
    setIsSubmitting(true);
    try {
      await createUser({ ...formData, tenantId: activeTenantId } as any);
      setIsModalOpen(false);
      setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'CATALOG_MANAGER' });
      fetchUsers(); // Refresh list to get real ID and DB state
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Full Name', accessor: (u: CompanyUser) => `${u.firstName} ${u.lastName}` },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Role', accessor: (u: CompanyUser) => <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{u.role.replace('_', ' ')}</span> },
    { header: 'Status', accessor: (u: CompanyUser) => <StatusBadge status={u.status} /> },
    { 
      header: 'Actions', 
      accessor: (u: CompanyUser) => (
        <div className="flex gap-2">
          {u.status === 'ACTIVE' ? (
            <AdminButton variant="outline" size="sm" onClick={() => updateUserStatus(u.id, 'SUSPENDED')}>Suspend</AdminButton>
          ) : (
            <AdminButton variant="primary" size="sm" onClick={() => updateUserStatus(u.id, 'ACTIVE')}>Activate</AdminButton>
          )}
        </div>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Company Operations">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Workspace Members</h2>
          <p className="text-sm text-slate-500">Manage individuals who have access to this company's administrative dashboard.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>}>
          Add User
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={users} 
        loading={isLoading}
        emptyMessage="No users found."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Invite Workspace Member"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Invite User</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
            <input type="password" required minLength={8} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Access Role</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
              <option value="TENANT_ADMIN">Tenant Admin (Full Access)</option>
              <option value="BUSINESS_OWNER">Business Owner</option>
              <option value="CATALOG_MANAGER">Catalog Manager (Products & Pricing)</option>
              <option value="SALES_USER">Sales User (Read Only/Quotes)</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
