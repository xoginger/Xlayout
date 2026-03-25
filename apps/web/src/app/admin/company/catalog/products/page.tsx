/**
 * Creado y diseñado por XO
 * XLayout System — Catálogo de Productos
 *
 * Página de negocio: gestión de productos, líneas, precios.
 * NO gestiona assets 3D — eso es responsabilidad del módulo Assets 3D.
 * Solo muestra un indicador ligero de si el producto tiene modelo 3D asociado.
 */

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, Product } from '@/store/admin-catalog-store';

// ─── Badge de estado del producto ────────────────────────────────────────────
const ProductStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PUBLISHED: { label: 'Publicado', cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' },
    DRAFT:     { label: 'Borrador',  cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' },
    ARCHIVED:  { label: 'Archivado', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  };
  const { label, cls } = map[status] ?? map['DRAFT'];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>{label}</span>;
};

// ─── Indicador ligero de asset 3D (sin gestión, solo referencia) ─────────────
const Asset3DIndicator: React.FC<{ assets: any[]; onNavigate: () => void }> = ({ assets, onNavigate }) => {
  const model3d = assets?.filter((a: any) => a.assetType === 'model_3d') || [];
  const hasValidated = model3d.some((a: any) => a.conversionStatus === 'validated');
  const hasProcessing = model3d.some((a: any) => ['processing', 'uploaded'].includes(a.conversionStatus));
  const hasError = model3d.some((a: any) => ['error', 'failed'].includes(a.conversionStatus));

  return (
    <button onClick={onNavigate} className="flex items-center gap-1 group cursor-pointer" title="Ver en módulo Assets 3D">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all group-hover:ring-2 group-hover:ring-blue-300 ${
        hasValidated ? 'bg-purple-100 text-purple-800' :
        hasProcessing ? 'bg-amber-100 text-amber-700 animate-pulse' :
        hasError ? 'bg-red-100 text-red-700' :
        model3d.length > 0 ? 'bg-blue-100 text-blue-700' :
        'bg-slate-100 text-slate-400'
      }`}>
        {hasValidated ? '✓' : hasProcessing ? '⚙' : hasError ? '✗' : model3d.length > 0 ? '↑' : '—'}
        {' '}3D ({model3d.length})
      </span>
    </button>
  );
};

// ─── Formulario por defecto para crear producto ─────────────────────────────
const defaultForm = () => ({
  name: '', sku: '', description: '', lineId: '', categoryId: '',
  width: 1.2, depth: 0.8, height: 0.75,
  priceA: '', priceB: '', priceC: '', priceD: '', priceE: '', currency: 'MXN',
});
type FormData = ReturnType<typeof defaultForm>;

// ─── Página principal de Catálogo ───────────────────────────────────────────
export default function CompanyProductsPage() {
  const {
    products, lines, categories,
    fetchProducts, fetchLines, fetchCategories,
    createProduct, createProductPrice,
    publishProduct, unpublishProduct,
    isLoading
  } = useAdminCatalogStore();

  const router = useRouter();
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

  // Crear producto (solo datos de negocio, sin 3D)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.lineId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const pricesPayload = ['A','B','C','D','E'].map(type => {
        const val = formData[`price${type}` as keyof FormData];
        if (!val) return null;
        return { priceType: type, basePrice: parseFloat(val as string), currency: formData.currency };
      }).filter(Boolean);

      await createProduct({
        name: formData.name, sku: formData.sku,
        description: formData.description || undefined,
        lineId: formData.lineId, categoryId: formData.categoryId || undefined,
        width: formData.width, depth: formData.depth, height: formData.height,
        prices: pricesPayload
      } as any);

      setIsModalOpen(false);
      setFormData(defaultForm());
      load();
    } catch (err: any) {
      setError(err?.message || 'Error al crear el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publicar / retirar producto
  const handlePublishToggle = async (product: Product) => {
    setPublishingId(product.id);
    try {
      if (product.status === 'PUBLISHED') await unpublishProduct(product.id);
      else await publishProduct(product.id);
    } catch { alert('Error al cambiar estado'); }
    finally { setPublishingId(null); }
  };

  // Helper para actualizar formulario
  const set = (field: keyof FormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({
        ...prev,
        [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
          : e.target.type === 'number' ? parseFloat(e.target.value) || 0
          : e.target.value,
      }))
  );

  // Columnas de la tabla — solo datos de negocio
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
        <span className="text-xs font-mono text-slate-500">{p.width}×{p.depth}×{p.height}m</span>
      )
    },
    {
      header: 'Precios',
      accessor: (p: Product) => {
        if (!p.prices || p.prices.length === 0) return <span className="text-xs text-slate-400">Sin precios</span>;
        return (
          <div className="flex gap-1 flex-wrap max-w-[120px]">
            {p.prices.map((price: any) => (
              <span key={price.id} className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 uppercase">
                {price.priceType}: ${Number(price.basePrice).toLocaleString()}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: '3D',
      accessor: (p: Product) => (
        <Asset3DIndicator
          assets={p.assets || []}
          onNavigate={() => router.push('/admin/company/catalog/assets')}
        />
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
            variant={p.status === 'PUBLISHED' ? 'outline' : 'primary'} size="sm"
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
            Gestiona los productos de tu catálogo. Para modelos 3D, usa el
            {' '}<button onClick={() => router.push('/admin/company/catalog/assets')} className="text-blue-600 hover:underline font-medium">módulo Assets 3D</button>.
          </p>
        </div>
        <AdminButton
          onClick={() => { setIsModalOpen(true); setFormData(defaultForm()); setError(null); }}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nuevo Producto
        </AdminButton>
      </div>

      {/* Estadísticas de negocio */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: products.length, color: 'text-slate-700' },
          { label: 'Publicados', value: products.filter(p => p.status === 'PUBLISHED').length, color: 'text-emerald-600' },
          { label: 'Borradores', value: products.filter(p => p.status === 'DRAFT').length, color: 'text-amber-600' },
          { label: 'Con Modelo 3D', value: products.filter(p => p.assets && p.assets.some((a: any) => a.assetType === 'model_3d')).length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de productos — solo negocio */}
      <AdminTable
        columns={columns as any}
        data={products}
        loading={isLoading}
        emptyMessage="No hay productos. Crea tu primer producto para comenzar."
      />

      {/* ─── Modal para crear producto (solo datos de negocio) ── */}
      <AdminModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Producto"
        footer={<>
          <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
          <AdminButton onClick={handleCreate} loading={isSubmitting}>Guardar Producto</AdminButton>
        </>}
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
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
          {/* Matriz de precios */}
          <div className="border-t border-slate-100 pt-4 bg-slate-50/50 -mx-6 px-6 pb-2">
            <div className="flex justify-between items-end mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matriz de Precios</p>
              <div className="w-24">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Moneda Base</label>
                <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:border-blue-500 focus:outline-none bg-white font-bold"
                  value={formData.currency} onChange={set('currency')}>
                  <option value="MXN">MXN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {['A','B','C','D','E'].map(type => (
                <div key={type} className="bg-white p-2 rounded-md border border-slate-200 shadow-sm">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 text-center bg-slate-100 py-0.5 rounded">TIPO {type}</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    className="w-full px-2 py-1 border border-transparent hover:border-slate-200 rounded text-sm text-center font-mono focus:border-blue-500 focus:outline-none"
                    value={formData[`price${type}` as keyof FormData] as string | number} onChange={set(`price${type}` as keyof FormData)} />
                </div>
              ))}
            </div>
          </div>
          {/* Nota sobre modelos 3D */}
          <div className="border-t border-slate-100 pt-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <span className="text-xl">🎲</span>
              <div>
                <p className="text-xs font-semibold text-blue-800">¿Necesitas subir un modelo 3D?</p>
                <p className="text-xs text-blue-600 mt-1">
                  Después de crear el producto, ve al módulo
                  {' '}<strong>Assets 3D</strong> para subir y gestionar modelos 3D con el pipeline de conversión.
                </p>
              </div>
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
