"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, Product } from '@/store/admin-catalog-store';

// ─── Status Badge for Product workflow ─────────────────────────────────────
const ProductStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PUBLISHED: { label: 'Publicado', cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' },
    DRAFT:     { label: 'Borrador',  cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' },
    ARCHIVED:  { label: 'Archivado', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  };
  const { label, cls } = map[status] ?? map['DRAFT'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
};

// ─── 3D Asset indicator ────────────────────────────────────────────────────
const AssetIndicator: React.FC<{ has3D: boolean }> = ({ has3D }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
    has3D ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-400'
  }`}>
    <span>{has3D ? '✓' : '✗'}</span>
    3D
  </span>
);

// ─── Default form state ─────────────────────────────────────────────────────
const defaultForm = () => ({
  name: '',
  sku: '',
  description: '',
  lineId: '',
  categoryId: '',
  width: 1.2,
  depth: 0.8,
  height: 0.75,
  // Price
  basePrice: '',
  currency: 'MXN',
  // 3D Asset
  model3dUrl: '',
  floorAnchor: 0,
  scaleFactor: 1,
  resizable: true,
});

type FormData = ReturnType<typeof defaultForm>;

export default function CompanyProductsPage() {
  const {
    products, lines, categories,
    fetchProducts, fetchLines, fetchCategories,
    createProduct, createAsset, createProductPrice,
    publishProduct, unpublishProduct,
    isLoading
  } = useAdminCatalogStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchProducts();
    fetchLines();
    fetchCategories();
  }, [fetchProducts, fetchLines, fetchCategories]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.lineId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Create product
      const newProduct = await createProduct({
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        lineId: formData.lineId,
        categoryId: formData.categoryId || undefined,
        width: formData.width,
        depth: formData.depth,
        height: formData.height,
      });

      // 2. Create price if provided
      if (formData.basePrice) {
        await createProductPrice(newProduct.id, {
          currency: formData.currency,
          basePrice: parseFloat(formData.basePrice as string),
          active: true,
        });
      }

      // 3. Create 3D asset if URL provided
      if (formData.model3dUrl) {
        await createAsset({
          productId: newProduct.id,
          assetType: 'model_3d',
          model3dUrl: formData.model3dUrl,
          metadata: {
            floorAnchor: formData.floorAnchor,
            scaleFactor: formData.scaleFactor,
            resizable: formData.resizable,
          },
        });
      }

      setIsModalOpen(false);
      setFormData(defaultForm());
      load();
    } catch (err: any) {
      setError(err?.message || 'Error al crear el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishToggle = async (product: Product) => {
    setPublishingId(product.id);
    try {
      if (product.status === 'PUBLISHED') {
        await unpublishProduct(product.id);
      } else {
        await publishProduct(product.id);
      }
    } catch (err) {
      alert('Error al cambiar el estado del producto');
    } finally {
      setPublishingId(null);
    }
  };

  const set = (field: keyof FormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({
        ...prev,
        [field]: e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.type === 'number'
          ? parseFloat(e.target.value) || 0
          : e.target.value,
      }))
  );

  const columns = [
    {
      header: 'Producto',
      accessor: (p: Product) => (
        <div>
          <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
          <div className="text-xs font-mono text-slate-400">{p.sku}</div>
        </div>
      )
    },
    {
      header: 'Línea',
      accessor: (p: Product) => (
        <span className="text-xs text-slate-600 font-medium">
          {p.line?.name || lines.find(l => l.id === p.lineId)?.name || '—'}
        </span>
      )
    },
    {
      header: 'Dimensiones',
      accessor: (p: Product) => (
        <span className="text-xs font-mono text-slate-500">
          {p.width}×{p.depth}×{p.height}m
        </span>
      )
    },
    {
      header: 'Precio',
      accessor: (p: Product) => {
        const price = p.prices?.[0];
        return price ? (
          <span className="text-xs font-semibold text-emerald-700">
            ${Number(price.basePrice).toLocaleString()} {price.currency}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Sin precio</span>
        );
      }
    },
    {
      header: '3D',
      accessor: (p: Product) => (
        <AssetIndicator has3D={!!(p.assets && p.assets.length > 0)} />
      )
    },
    {
      header: 'Estado',
      accessor: (p: Product) => <ProductStatusBadge status={p.status} />
    },
    {
      header: 'Acciones',
      accessor: (p: Product) => (
        <div className="flex gap-2 items-center">
          <AdminButton
            variant={p.status === 'PUBLISHED' ? 'outline' : 'primary'}
            size="sm"
            loading={publishingId === p.id}
            onClick={() => handlePublishToggle(p)}
          >
            {p.status === 'PUBLISHED' ? 'Retirar' : 'Publicar'}
          </AdminButton>
        </div>
      )
    },
  ];

  return (
    <AdminLayout type="company" title="Catálogo de Productos">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Inventario de Productos</h2>
          <p className="text-sm text-slate-500">
            Gestiona productos, asocia modelos 3D, precios y publica al catálogo del editor.
          </p>
        </div>
        <AdminButton
          onClick={() => { setIsModalOpen(true); setFormData(defaultForm()); setError(null); }}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nuevo Producto
        </AdminButton>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: products.length, color: 'text-slate-700' },
          { label: 'Publicados', value: products.filter(p => p.status === 'PUBLISHED').length, color: 'text-emerald-600' },
          { label: 'Borradores', value: products.filter(p => p.status === 'DRAFT').length, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <AdminTable
        columns={columns as any}
        data={products}
        loading={isLoading}
        emptyMessage="No hay productos. Crea tu primer producto para comenzar."
      />

      {/* ─── Create Modal ──────────────────────────────────────────────────── */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Producto"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Guardar Producto</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre *</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                value={formData.name} onChange={set('name')} placeholder="Escritorio Ejecutivo Pro" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SKU *</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                value={formData.sku} onChange={set('sku')} placeholder="DK-001" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Línea *</label>
              <select required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                value={formData.lineId} onChange={set('lineId')}>
                <option value="">Seleccionar línea...</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descripción</label>
              <textarea className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                rows={2} value={formData.description} onChange={set('description')} placeholder="Descripción del producto..." />
            </div>
          </div>

          {/* Dimensions */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dimensiones (metros)</p>
            <div className="grid grid-cols-3 gap-3">
              {(['width', 'depth', 'height'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs text-slate-600 mb-1 capitalize">{field === 'width' ? 'Ancho' : field === 'depth' ? 'Fondo' : 'Alto'}</label>
                  <input type="number" step="0.01" min="0.01" required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                    value={formData[field]} onChange={set(field)} />
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Precio (opcional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Precio base</label>
                <input type="number" step="0.01" min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.basePrice} onChange={set('basePrice')} placeholder="12500.00" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Moneda</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.currency} onChange={set('currency')}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3D Model */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Modelo 3D (opcional)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">URL del modelo GLB</label>
                <input type="url"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:border-blue-500 focus:outline-none"
                  value={formData.model3dUrl} onChange={set('model3dUrl')}
                  placeholder="https://storage.xlayout.io/models/escritorio.glb" />
                <p className="text-[10px] text-slate-400 mt-1">URL pública a un archivo .glb o .gltf</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Floor Anchor (0-1)</label>
                  <input type="number" step="0.1" min="0" max="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.floorAnchor} onChange={set('floorAnchor')} />
                  <p className="text-[10px] text-slate-400">0=base, 0.5=centro</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Scale Factor</label>
                  <input type="number" step="0.01" min="0.01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.scaleFactor} onChange={set('scaleFactor')} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.resizable}
                      onChange={e => setFormData(prev => ({ ...prev, resizable: e.target.checked }))} />
                    <span className="text-xs text-slate-700 font-medium">Redimensionable</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
