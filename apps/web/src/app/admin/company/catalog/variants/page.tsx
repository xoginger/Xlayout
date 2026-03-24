/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, Product } from '@/store/admin-catalog-store';
import { api } from '@/lib/api';

// Tipos de variante soportados
const VARIANT_TYPES = [
  { value: 'color', label: 'Color', icon: '🎨' },
  { value: 'texture', label: 'Textura', icon: '🧱' },
  { value: 'material', label: 'Material', icon: '🪵' },
  { value: 'finish', label: 'Acabado', icon: '✨' },
  { value: 'size', label: 'Tamaño', icon: '📐' },
];

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  variantType: string;
  metadata: any;
  sortOrder: number;
  active: boolean;
  product?: any;
}

// Gestión de variantes de productos (colores, texturas, materiales, acabados)
export default function CompanyVariantsPage() {
  const { products, fetchProducts, isLoading: productsLoading } = useAdminCatalogStore();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Producto seleccionado para filtrar variantes
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [form, setForm] = useState({
    productId: '',
    name: '',
    variantType: 'color',
    colorHex: '#3B82F6',
    textureUrl: '',
    sortOrder: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cargar variantes cuando se selecciona un producto
  useEffect(() => {
    if (selectedProductId) {
      loadVariants(selectedProductId);
    } else {
      setVariants([]);
    }
  }, [selectedProductId]);

  const loadVariants = async (productId: string) => {
    setIsLoading(true);
    try {
      const data = await api.get<ProductVariant[]>(`/catalog/products/${productId}/variants`);
      setVariants(data);
    } catch (err) {
      console.error('Error al cargar variantes', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear variante
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.name) return;
    setIsSubmitting(true);
    try {
      const metadata: any = {};
      if (form.variantType === 'color') metadata.hex = form.colorHex;
      if (form.variantType === 'texture') metadata.textureUrl = form.textureUrl;

      await api.post(`/catalog/products/${form.productId}/variants`, {
        name: form.name,
        variantType: form.variantType,
        metadata,
        sortOrder: form.sortOrder,
      });
      setIsModalOpen(false);
      setForm({ productId: '', name: '', variantType: 'color', colorHex: '#3B82F6', textureUrl: '', sortOrder: 0 });
      if (selectedProductId) loadVariants(selectedProductId);
    } catch (err) {
      alert('Error al crear variante');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar variante (soft delete)
  const handleDelete = async (variantId: string) => {
    if (!confirm('¿Desactivar esta variante?')) return;
    try {
      await api.delete(`/catalog/variants/${variantId}`);
      if (selectedProductId) loadVariants(selectedProductId);
    } catch (err) {
      alert('Error al eliminar variante');
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      header: 'Variante',
      accessor: (v: ProductVariant) => (
        <div className="flex items-center gap-3">
          {/* Previsualización de color si aplica */}
          {v.variantType === 'color' && v.metadata?.hex && (
            <div
              className="w-8 h-8 rounded-lg border-2 border-slate-200 shadow-inner"
              style={{ backgroundColor: v.metadata.hex }}
            />
          )}
          {v.variantType !== 'color' && (
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
              {VARIANT_TYPES.find(t => t.value === v.variantType)?.icon || '📦'}
            </div>
          )}
          <div>
            <span className="font-semibold text-slate-900">{v.name}</span>
            <span className="block text-xs text-slate-500">{v.variantType}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: (v: ProductVariant) => {
        const type = VARIANT_TYPES.find(t => t.value === v.variantType);
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
            {type?.icon} {type?.label || v.variantType}
          </span>
        );
      },
    },
    {
      header: 'Orden',
      accessor: (v: ProductVariant) => <span className="text-sm text-slate-600">{v.sortOrder}</span>,
    },
    {
      header: 'Metadata',
      accessor: (v: ProductVariant) => (
        <span className="text-xs text-slate-400 font-mono">
          {JSON.stringify(v.metadata || {}).substring(0, 40)}
        </span>
      ),
    },
    {
      header: 'Acciones',
      accessor: (v: ProductVariant) => (
        <AdminButton variant="outline" size="sm" onClick={() => handleDelete(v.id)}>
          Desactivar
        </AdminButton>
      ),
    },
  ];

  return (
    <AdminLayout type="company" title="Variantes de Producto">
      {/* Explicación */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 text-sm">Variantes de Producto</h3>
        <p className="text-xs text-blue-700 mt-1">
          Las variantes permiten ofrecer diferentes opciones de un mismo producto: colores, texturas,
          materiales o acabados. Cada variante se asocia a un producto existente y puede incluir
          metadatos como código de color HEX o URL de textura.
        </p>
      </div>

      {/* Selector de producto */}
      <div className="flex justify-between items-end mb-6">
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-slate-700 mb-1">Filtrar por Producto</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>
        <AdminButton
          onClick={() => {
            setForm({ ...form, productId: selectedProductId });
            setIsModalOpen(true);
          }}
          disabled={!selectedProductId}
        >
          + Nueva Variante
        </AdminButton>
      </div>

      {/* Tabla de variantes */}
      {selectedProductId ? (
        <AdminTable
          columns={columns as any}
          data={variants}
          loading={isLoading}
          emptyMessage="Este producto no tiene variantes. Crea la primera para ofrecer opciones de color, textura o material."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
          </svg>
          <p className="text-slate-500 mb-2">Selecciona un producto para ver sus variantes</p>
          <p className="text-xs text-slate-400">Las variantes permiten ofrecer colores, texturas y acabados diferentes.</p>
        </div>
      )}

      {/* Modal: Crear Variante */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Variante"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Crear Variante</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                placeholder="Ej: Roble Natural"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={form.variantType}
                onChange={(e) => setForm({ ...form, variantType: e.target.value })}
              >
                {VARIANT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Campo dinámico según tipo */}
          {form.variantType === 'color' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                  value={form.colorHex}
                  onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                />
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 font-mono"
                  placeholder="#3B82F6"
                  value={form.colorHex}
                  onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.variantType === 'texture' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL de Textura</label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                placeholder="https://..."
                value={form.textureUrl}
                onChange={(e) => setForm({ ...form, textureUrl: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orden de visualización</label>
            <input
              type="number" min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
