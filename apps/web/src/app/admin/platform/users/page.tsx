"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { api } from '@/lib/api';

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any[]>('/platform-users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/platform-users', formData);
      setIsModalOpen(false);
      setFormData({ email: '', password: '', firstName: '', lastName: '' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error creating platform user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/platform-users/${id}/status`, { status });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const columns = [
    { header: 'Full Name', accessor: (u: any) => `${u.firstName} ${u.lastName}` },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Status', accessor: (u: any) => <StatusBadge status={u.status} /> },
    { header: 'Date Joined', accessor: (u: any) => new Date(u.createdAt).toLocaleDateString() },
    { 
      header: 'Actions', 
      accessor: (u: any) => (
        <div className="flex gap-2">
          {u.status === 'ACTIVE' ? (
            <AdminButton variant="outline" size="sm" onClick={() => updateStatus(u.id, 'SUSPENDED')}>Suspend</AdminButton>
          ) : (
            <AdminButton variant="primary" size="sm" onClick={() => updateStatus(u.id, 'ACTIVE')}>Activate</AdminButton>
          )}
        </div>
      ) 
    },
  ];

  return (
    <AdminLayout type="platform" title="Platform Administrators">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Xocotzin Team</h2>
          <p className="text-sm text-slate-500">Manage internal users with global platform access.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>}>
          Invite Admin
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={users} 
        loading={isLoading}
        emptyMessage="No platform users found."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Invite Platform Admin"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Invite Admin</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Platform Email</label>
            <input type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
            <input type="password" required minLength={8} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
