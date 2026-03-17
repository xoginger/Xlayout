"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, Product } from '@/store/admin-catalog-store';

export default function CompanyProductsPage() {
  const { products, lines, categories, fetchProducts, fetchLines, fetchCategories, createProduct, updateProductStatus, isLoading } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    lineId: '',
    categoryId: '',
    width: 0,
    depth: 0,
    height: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchLines();
    fetchCategories();
  }, [fetchProducts, fetchLines, fetchCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.lineId || !formData.categoryId) return;
    setIsSubmitting(true);
    try {
      await createProduct(formData);
      setIsModalOpen(false);
      setFormData({ name: '', sku: '', lineId: '', categoryId: '', width: 0, depth: 0, height: 0 });
      fetchProducts();
    } catch (err) {
      alert('Error creating product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await updateProductStatus(id, !currentStatus);
    } catch (err) {
      alert('Error updating product status');
    }
  };

  const columns = [
    { header: 'Product Name', accessor: 'name' as const },
    { header: 'SKU', accessor: 'sku' as const },
    { header: 'Line', accessor: (p: Product) => lines.find(l => l.id === p.lineId)?.name || 'Unknown' },
    { header: 'Category', accessor: (p: Product) => categories.find(c => c.id === p.categoryId)?.name || 'Unknown' },
    { header: 'Dimensions (W×D×H)', accessor: (p: Product) => `${p.width}m × ${p.depth}m × ${p.height}m` },
    { header: 'Status', accessor: (p: Product) => <StatusBadge status={p.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { 
      header: 'Actions', 
      accessor: (p: Product) => (
        <div className="flex gap-2">
          <AdminButton 
            variant={p.active ? "outline" : "primary"} 
            size="sm" 
            onClick={() => handleStatusToggle(p.id, p.active)}
          >
            {p.active ? 'Disable' : 'Enable'}
          </AdminButton>
          <AdminButton variant="ghost" size="sm" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>}></AdminButton>
        </div>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Product Catalog">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Company Inventory</h2>
          <p className="text-sm text-slate-500">Manage individual product definitions, specs, and their spatial metadata.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          Add Product
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={products} 
        loading={isLoading}
        emptyMessage="No products found. Add items to your catalog!"
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New Product"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Save Product</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Line</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.lineId}
              onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
            >
              <option value="">Select Line...</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Category Taxonomy</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Select Category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Width (m)</label>
            <input 
              type="number" step="0.01" required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              value={formData.width}
              onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Depth (m)</label>
            <input 
              type="number" step="0.01" required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              value={formData.depth}
              onChange={(e) => setFormData({ ...formData, depth: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Height (m) - Optional</label>
            <input 
              type="number" step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
