"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, ProductAsset } from '@/store/admin-catalog-store';

export default function CompanyAssetsPage() {
  const { assets, products, fetchAssets, fetchProducts, createAsset, isLoading } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ProductAsset>>({
    productId: '',
    assetType: 'image',
    fileUrl: '',
    thumbnailUrl: '',
    model3dUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchProducts();
  }, [fetchAssets, fetchProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.assetType) return;
    setIsSubmitting(true);
    try {
      await createAsset(formData);
      setIsModalOpen(false);
      setFormData({ productId: '', assetType: 'image', fileUrl: '', thumbnailUrl: '', model3dUrl: '' });
      fetchAssets();
    } catch (err) {
      alert('Error adding asset to product.\nURL provided must be a valid file url or 3D Model JSON.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Product Name', accessor: (a: ProductAsset & { product?: any }) => a.product?.name || a.productId },
    { 
      header: 'Type', 
      accessor: (a: ProductAsset) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
          a.assetType === 'model_3d' ? 'bg-purple-100 text-purple-800' :
          a.assetType === 'image' ? 'bg-blue-100 text-blue-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {a.assetType}
        </span>
      ) 
    },
    { 
      header: 'Data Reference', 
      accessor: (a: ProductAsset) => (
        <a href={a.model3dUrl || a.fileUrl || a.thumbnailUrl || '#'} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs truncate block max-w-xs">
          {a.model3dUrl || a.fileUrl || a.thumbnailUrl || 'No external URL'}
        </a>
      )
    },
    { 
      header: 'Actions', 
      accessor: (a: ProductAsset) => (
        <AdminButton variant="ghost" size="sm" icon={<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>}></AdminButton>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Product Assets">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Digital Media & Models</h2>
          <p className="text-sm text-slate-500">Attach 3D meshes, footprint SVGs, and thumbnail images to your catalog products.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>}>
          Add Asset
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={assets} 
        loading={isLoading}
        emptyMessage="No assets registered. Upload images or link 3D models here."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Link Asset to Product"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Save Asset</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Product</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              <option value="">Select Product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asset Type</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.assetType}
              onChange={(e) => setFormData({ ...formData, assetType: e.target.value as any })}
            >
              <option value="model_3d">3D Model (JSON / GLTF)</option>
              <option value="image">High-Res Image</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="footprint_svg">2D Footprint (SVG)</option>
            </select>
          </div>

          {formData.assetType === 'model_3d' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model 3D URL</label>
              <input 
                type="url" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                placeholder="https://storage.xlayout.io/models/mesh.json"
                value={formData.model3dUrl || ''}
                onChange={(e) => setFormData({ ...formData, model3dUrl: e.target.value })}
              />
            </div>
          )}

          {['image', 'thumbnail', 'footprint_svg'].includes(formData.assetType || '') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File URL</label>
              <input 
                type="url" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
                placeholder="https://storage.xlayout.io/images/product.jpg"
                value={formData.fileUrl || ''}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
              />
            </div>
          )}

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
