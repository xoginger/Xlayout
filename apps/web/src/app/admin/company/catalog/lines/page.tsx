"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, ProductLine } from '@/store/admin-catalog-store';

export default function CompanyLinesPage() {
  const { lines, fetchLines, createLine, updateLineStatus, isLoading } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lineName, setLineName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineName) return;
    setIsSubmitting(true);
    try {
      await createLine(lineName);
      setIsModalOpen(false);
      setLineName('');
      fetchLines();
    } catch (err) {
      alert('Error creating product line');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await updateLineStatus(id, !currentStatus);
    } catch (err) {
      alert('Error updating line status');
    }
  };

  const columns = [
    { header: 'Line Name', accessor: 'name' as const },
    { header: 'Slug', accessor: 'slug' as const },
    { header: 'Status', accessor: (l: ProductLine) => <StatusBadge status={l.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { 
      header: 'Actions', 
      accessor: (l: ProductLine) => (
        <div className="flex gap-2">
          <AdminButton 
            variant={l.active ? "outline" : "primary"} 
            size="sm" 
            onClick={() => handleStatusToggle(l.id, l.active)}
          >
            {l.active ? 'Disable' : 'Enable'}
          </AdminButton>
        </div>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Product Lines">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Catalog structure</h2>
          <p className="text-sm text-slate-500">Group your products by collections or design lines.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          New Product Line
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={lines} 
        loading={isLoading}
        emptyMessage="No product lines found. Start your catalog here!"
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create Product Line"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Create Line</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Line Name</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              placeholder="e.g. Ergonomic Office 2026"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
            />
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
