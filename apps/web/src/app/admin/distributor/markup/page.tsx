/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAuthStore } from '@/store/auth-store';
import { useDistributorStore, DistributorMarkup } from '@/store/distributor-store';

// Gestión de reglas de markup — solo visible para DISTRIBUTOR_ADMIN
export default function DistributorMarkupPage() {
  const { user } = useAuthStore();
  const { fetchDistributor, setMarkup, deactivateMarkup } = useDistributorStore();

  const [markups, setMarkups] = useState<DistributorMarkup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    scope: 'GLOBAL' as 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT',
    markupPercent: 15,
    priority: 0,
  });

  const distributorId = user?.distributorId;
  const isAdmin = user?.distributorRole === 'DISTRIBUTOR_ADMIN';

  useEffect(() => {
    loadMarkups();
  }, [distributorId]);

  const loadMarkups = async () => {
    if (!distributorId) return;
    setIsLoading(true);
    try {
      const data = await fetchDistributor(distributorId);
      setMarkups(data?.priceMarkups || []);
    } catch (err) {
      console.error('Error al cargar markup', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear regla de markup
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributorId) return;
    setIsSubmitting(true);
    try {
      await setMarkup(distributorId, form);
      setIsModalOpen(false);
      setForm({ scope: 'GLOBAL', markupPercent: 15, priority: 0 });
      loadMarkups();
    } catch (err) {
      alert('Error al crear regla');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Desactivar regla
  const handleDeactivate = async (markupId: string) => {
    if (!distributorId) return;
    if (!confirm('¿Desactivar esta regla de markup?')) return;
    try {
      await deactivateMarkup(distributorId, markupId);
      loadMarkups();
    } catch (err) {
      alert('Error al desactivar');
    }
  };

  // Etiquetas de alcance
  const scopeLabels: Record<string, string> = {
    GLOBAL: '🌐 Global',
    BY_TENANT: '🏭 Por Fabricante',
    BY_LINE: '📦 Por Línea',
    BY_PRODUCT: '🎯 Por Producto',
  };

  const columns = [
    {
      header: 'Alcance',
      accessor: (m: DistributorMarkup) => (
        <span className="font-medium text-slate-800">{scopeLabels[m.scope] || m.scope}</span>
      ),
    },
    {
      header: 'Incremento',
      accessor: (m: DistributorMarkup) => (
        <span className="text-lg font-bold text-emerald-700">+{m.markupPercent}%</span>
      ),
    },
    {
      header: 'Prioridad',
      accessor: (m: DistributorMarkup) => (
        <span className="text-sm text-slate-600">{m.priority}</span>
      ),
    },
    {
      header: 'Estado',
      accessor: (m: DistributorMarkup) => <StatusBadge status={m.active ? 'ACTIVE' : 'INACTIVE'} />,
    },
    ...(isAdmin ? [{
      header: 'Acciones',
      accessor: (m: DistributorMarkup) => (
        m.active ? (
          <AdminButton variant="outline" size="sm" onClick={() => handleDeactivate(m.id)}>
            Desactivar
          </AdminButton>
        ) : null
      ),
    }] : []),
  ];

  return (
    <AdminLayout type="distributor" title="Markup de Precios">
      {/* Explicación */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-emerald-800 text-sm">¿Qué es el Markup?</h3>
        <p className="text-xs text-emerald-700 mt-1">
          El markup es el porcentaje de incremento que aplicas sobre el precio base del fabricante 
          para establecer tu precio de venta al cliente final. Ejemplo: un markup del 20% sobre 
          un precio base de $1,000 resulta en un precio de venta de $1,200.
        </p>
        <p className="text-xs text-emerald-700 mt-1">
          <strong>Prioridad:</strong> Si hay múltiples reglas, se aplica la de mayor especificidad: 
          Producto &gt; Línea &gt; Fabricante &gt; Global.
        </p>
      </div>

      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reglas de Incremento Comercial</h2>
          <p className="text-sm text-slate-500">
            {isAdmin 
              ? 'Configura los incrementos sobre los precios base de los fabricantes.'
              : 'Vista de las reglas de markup aplicadas por tu administrador.'}
          </p>
        </div>
        {isAdmin && (
          <AdminButton onClick={() => setIsModalOpen(true)}>
            + Nueva Regla
          </AdminButton>
        )}
      </div>

      {/* Tabla */}
      <AdminTable
        columns={columns as any}
        data={markups}
        loading={isLoading}
        emptyMessage="Sin reglas de markup. Los precios de catálogo se muestran sin incremento."
      />

      {/* Modal: Crear Regla */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Regla de Markup"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Crear Regla</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alcance</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as any })}
            >
              <option value="GLOBAL">Global — todos los productos</option>
              <option value="BY_TENANT">Por Fabricante</option>
              <option value="BY_LINE">Por Línea de Producto</option>
              <option value="BY_PRODUCT">Por Producto Específico</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Incremento (%)</label>
              <input
                type="number" step="0.1" min="0" max="500" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={form.markupPercent}
                onChange={(e) => setForm({ ...form, markupPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <input
                type="number" min="0" max="100"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
