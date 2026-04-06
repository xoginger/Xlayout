"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, ProductCategory } from '@/store/admin-catalog-store';

export default function CompanyCategoriesPage() {
  const { categories, fetchCategories, createCategory, updateCategoryStatus, isLoading } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', parentId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSubmitting(true);
    try {
      await createCategory(formData.name, formData.parentId || undefined);
      setIsModalOpen(false);
      setFormData({ name: '', parentId: '' });
      fetchCategories(); // Refresh to ensure tree relations are updated perfectly
    } catch (err) {
      alert('Error creating product category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await updateCategoryStatus(id, !currentStatus);
    } catch (err) {
      alert('Error updating category status');
    }
  };

  const columns = [
    { header: 'Category Name', accessor: 'name' as const },
    { header: 'Slug', accessor: 'slug' as const },
    { 
      header: 'Parent Level', 
      accessor: (c: ProductCategory & { parent?: any }) => c.parent ? <span className="text-blue-600 text-xs font-semibold">{c.parent.name}</span> : <span className="text-slate-400 text-xs italic">Root Category</span> 
    },
    { header: 'Status', accessor: (c: any) => <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { 
      header: 'Actions', 
      accessor: (c: any) => (
        <div className="flex gap-2">
          <AdminButton 
            variant={c.active ? "outline" : "primary"} 
            size="sm" 
            onClick={() => handleStatusToggle(c.id, c.active)}
          >
            {c.active ? 'Disable' : 'Enable'}
          </AdminButton>
        </div>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Product Categories">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Taxonomy Tree</h2>
          <p className="text-sm text-slate-500">Organize your products in a hierarchical tree for easier navigation.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          New Category
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={categories} 
        loading={isLoading}
        emptyMessage="No product categories found. Create your taxonomy root!"
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create Product Category"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Create Category</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              placeholder="e.g. Ergonomic Chairs"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parent Category (Optional)</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.parentId}
              onChange={(e) => setFormData({...formData, parentId: e.target.value})}
            >
              <option value="">-- None (Root Level) --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Leave empty to create a top-level category.</p>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
