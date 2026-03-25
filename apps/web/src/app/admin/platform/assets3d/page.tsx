/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { usePlatformStore, Asset3D } from '@/store/admin-platform-store';

// Mapear estados de conversión a etiquetas legibles
const conversionLabels: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  converted: 'Convertido',
  validated: 'Validado',
  failed: 'Fallido',
  url_only: 'Solo URL',
};

export default function PlatformAssets3DPage() {
  const { assets3d, fetchAssets3d, metrics, fetchMetrics, isLoading } = usePlatformStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchAssets3d();
    fetchMetrics();
  }, [fetchAssets3d, fetchMetrics]);

  // Tabs por estado de conversión
  const statusTabs = [
    { id: '', label: 'Todos', count: assets3d.length },
    { id: 'converted', label: 'Procesados', count: assets3d.filter((a) => a.conversionStatus === 'converted' || a.conversionStatus === 'validated').length },
    { id: 'failed', label: 'Con Error', count: assets3d.filter((a) => a.conversionStatus === 'failed').length },
    { id: 'pending', label: 'Pendientes', count: assets3d.filter((a) => a.conversionStatus === 'pending' || a.conversionStatus === 'processing').length },
  ];

  // Filtrar assets
  const filtered = assets3d.filter((a) => {
    if (statusFilter) {
      if (statusFilter === 'converted' && a.conversionStatus !== 'converted' && a.conversionStatus !== 'validated') return false;
      if (statusFilter === 'failed' && a.conversionStatus !== 'failed') return false;
      if (statusFilter === 'pending' && a.conversionStatus !== 'pending' && a.conversionStatus !== 'processing') return false;
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (
        !a.product?.name?.toLowerCase().includes(q) &&
        !a.product?.sku?.toLowerCase().includes(q) &&
        !a.tenant?.name?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Mapear estado a estilo de badge
  const getConversionBadge = (status: string) => {
    if (status === 'converted' || status === 'validated') return 'ACTIVE';
    if (status === 'failed') return 'FAILED';
    if (status === 'pending' || status === 'processing') return 'PENDING';
    return status.toUpperCase();
  };

  const columns = [
    { header: 'Producto', accessor: (a: Asset3D) => (
      <div>
        <p className="font-medium text-slate-800">{a.product?.name || 'Sin nombre'}</p>
        <p className="text-xs text-slate-500 font-mono">{a.product?.sku || a.productId.slice(0, 8)}</p>
      </div>
    )},
    { header: 'Marca', accessor: (a: Asset3D) => (
      <span className="text-sm text-slate-600">{a.tenant?.name || '-'}</span>
    )},
    { header: 'Formato Original', accessor: (a: Asset3D) => (
      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 uppercase">
        {a.originalFormat || 'N/A'}
      </span>
    )},
    { header: 'Estado', accessor: (a: Asset3D) => (
      <StatusBadge status={getConversionBadge(a.conversionStatus)} />
    )},
    { header: 'Error', accessor: (a: Asset3D) => (
      a.conversionError
        ? <span className="text-xs text-rose-600 max-w-[200px] truncate block" title={a.conversionError}>{a.conversionError}</span>
        : <span className="text-xs text-slate-400">-</span>
    )},
    { header: 'Fecha', accessor: (a: Asset3D) =>
      new Date(a.createdAt).toLocaleDateString('es-MX')
    },
  ];

  return (
    <AdminLayout type="platform" title="Assets 3D">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pipeline de Assets 3D</h2>
        <p className="text-sm text-slate-500">Estado global de los modelos 3D en el sistema: conversiones, errores y validaciones.</p>
      </div>

      {/* KPIs del pipeline */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="admin-card p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{metrics.assets3d.total}</p>
            <p className="text-xs text-slate-500 mt-1">Assets Totales</p>
          </div>
          <div className="admin-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{metrics.assets3d.converted}</p>
            <p className="text-xs text-slate-500 mt-1">Procesados</p>
          </div>
          <div className="admin-card p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{metrics.assets3d.failed}</p>
            <p className="text-xs text-slate-500 mt-1">Con Error</p>
          </div>
          <div className="admin-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{metrics.assets3d.pending}</p>
            <p className="text-xs text-slate-500 mt-1">Pendientes</p>
          </div>
        </div>
      )}

      {/* Tabs de estado */}
      <AdminTabs
        tabs={statusTabs}
        activeTab={statusFilter}
        onChange={setStatusFilter}
        variant="pills"
      />

      {/* Filtros */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar producto, SKU o marca...', value: searchFilter },
        ]}
        onChange={(id, value) => {
          if (id === 'search') setSearchFilter(value);
        }}
        onClear={() => setSearchFilter('')}
        hasActiveFilters={!!searchFilter}
      />

      {/* Tabla de assets */}
      <AdminTable
        columns={columns as any}
        data={filtered}
        loading={isLoading}
        emptyMessage="No se encontraron assets 3D con estos filtros."
      />
    </AdminLayout>
  );
}
