/**
 * Creado y diseñado por XO
 * XLayout System — Pipeline Global de Assets 3D
 *
 * Monitoreo multi-tenant de modelos 3D: estados, tamaños, compresión y errores.
 * Hardened: previene crasheos por datos nulos y maneja assets de biblioteca ("unlinked").
 */

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { usePlatformStore, Asset3D, Tenant } from '@/store/admin-platform-store';

// ─── Utilidad de formateo ────────────────────────────────────────────────────
const formatBytes = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ─── Badge de conversión especializado ───────────────────────────────────────
const ConversionStateBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    validated:   { label: 'Validado',    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    converted:   { label: 'Convertido',  cls: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    processing:  { label: 'Procesando',  cls: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' },
    pending:     { label: 'Pendiente',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    failed:      { label: 'Error',       cls: 'bg-rose-100 text-rose-800 border-rose-200' },
    error:       { label: 'Error',       cls: 'bg-rose-100 text-rose-800 border-rose-200' },
    url_only:    { label: 'Link Externo',cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  };
  const cfg = map[status] ?? { label: status.toUpperCase(), cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

export default function PlatformAssets3DPage() {
  const { 
    assets3d, fetchAssets3d, 
    metrics, fetchMetrics,
    tenants, fetchTenants,
    isLoading 
  } = usePlatformStore();

  const [statusFilter, setStatusFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const load = useCallback(() => {
    fetchAssets3d();
    fetchMetrics();
    fetchTenants();
  }, [fetchAssets3d, fetchMetrics, fetchTenants]);

  useEffect(() => { load(); }, [load]);

  // Tabs globales
  const statusTabs = [
    { id: '', label: 'Todos', count: assets3d.length },
    { id: 'validated', label: 'Validados', count: assets3d.filter(a => a.conversionStatus === 'validated').length },
    { id: 'failed', label: 'Errores', count: assets3d.filter(a => ['failed', 'error'].includes(a.conversionStatus)).length },
    { id: 'pending', label: 'En Cola', count: assets3d.filter(a => ['pending', 'processing'].includes(a.conversionStatus)).length },
  ];

  // Filtros combinados
  const filtered = assets3d.filter(a => {
    if (statusFilter && a.conversionStatus !== statusFilter) {
      if (statusFilter === 'failed' && a.conversionStatus !== 'error' && a.conversionStatus !== 'failed') return false;
      if (statusFilter === 'pending' && a.conversionStatus !== 'pending' && a.conversionStatus !== 'processing') return false;
      if (statusFilter !== 'failed' && statusFilter !== 'pending') return false;
    }
    if (statusFilter === 'validated' && a.conversionStatus !== 'validated') return false;

    if (tenantFilter && a.tenantId !== tenantFilter) return false;

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchProduct = a.product?.name?.toLowerCase().includes(q) || a.product?.sku?.toLowerCase().includes(q);
      const matchID = a.id.toLowerCase().includes(q) || a.productId?.toLowerCase().includes(q);
      const matchTenant = a.tenant?.name?.toLowerCase().includes(q);
      if (!matchProduct && !matchID && !matchTenant) return false;
    }
    return true;
  });

  const columns = [
    {
      header: 'Identidad / Marca',
      accessor: (a: Asset3D) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase">
              {a.tenant?.name || 'Sistema'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-800 line-clamp-1">
             {a.product?.name || <span className="text-slate-400 italic">Asset s/ Producto (Biblioteca)</span>}
          </p>
        </div>
      )
    },
    {
      header: 'Pipeline',
      accessor: (a: Asset3D) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <ConversionStateBadge status={a.conversionStatus} />
            <span className="text-[9px] font-mono text-slate-400 uppercase">{a.originalFormat || '???'}</span>
          </div>
          {a.conversionError && (
            <p className="text-[9px] text-rose-500 font-medium truncate max-w-[120px]" title={a.conversionError}>
              ⚠ {a.conversionError}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Optimización',
      accessor: (a: Asset3D) => {
        const meta = a.metadata || {};
        const ratio = meta.compressionRatio || 0;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dracoEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`} title="Draco" />
              <span className="text-[10px] font-bold text-slate-700">{formatBytes(meta.optimizedSizeBytes || meta.originalSizeBytes)}</span>
            </div>
            {ratio > 0 && (
              <span className="text-[9px] text-emerald-600 font-bold">↓ {ratio}% ahorro</span>
            )}
          </div>
        );
      }
    },
    {
       header: 'Dimensiones / Tri.',
       accessor: (a: Asset3D) => {
         const meta = a.metadata || {};
         const tris = meta.triangles ? (meta.triangles / 1000).toFixed(1) + 'k' : '-';
         const dims = meta.boundingBox ? `${meta.boundingBox.width.toFixed(1)}m x ${meta.boundingBox.height.toFixed(1)}m` : '-';
         return (
           <div className="text-[10px] text-slate-500 leading-tight">
             <p><span className="font-bold text-slate-700">Tris:</span> {tris}</p>
             <p><span className="font-bold text-slate-700">Size:</span> {dims}</p>
           </div>
         );
       }
    },
    {
      header: 'Fecha',
      accessor: (a: Asset3D) => (
        <span className="text-[10px] text-slate-500 font-mono">
          {new Date(a.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
        </span>
      )
    },
    {
      header: 'Acciones',
      accessor: (a: Asset3D) => (
        <div className="flex gap-1.5">
           {a.id && (
             <button 
               className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition-colors"
               onClick={() => window.open(`/api/catalog/assets/${a.id}/download`, '_blank')}
               title="Descargar Original"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4-4v12"/></svg>
             </button>
           )}
        </div>
      )
    }
  ];

  return (
    <AdminLayout type="platform" title="Pipeline Global 3D">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Control Center: Assets 3D</h2>
          <p className="text-sm text-slate-500">Monitoreo de conversiones, validación métrica y almacenamiento multi-tenant.</p>
        </div>
        <div className="flex gap-4">
           {/* Resumen ligero si métricas no cargan */}
           <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <span className="text-[10px] font-black text-indigo-400 uppercase block tracking-widest">Global Assets</span>
              <span className="text-lg font-bold text-indigo-700 leading-none">{assets3d.length}</span>
           </div>
        </div>
      </div>

      {/* KPIs del pipeline */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Sistema', val: metrics.assets3d.total, sub: 'Modelos subidos', cls: 'text-slate-900', bg: 'bg-white' },
            { label: 'Salud Pipeline', val: metrics.assets3d.converted, sub: 'Procesados OK', cls: 'text-emerald-600', bg: 'bg-emerald-50/30' },
            { label: 'Tasa de Error', val: metrics.assets3d.failed, sub: 'Requieren revisión', cls: 'text-rose-600', bg: 'bg-rose-50/30' },
            { label: 'En Espera', val: metrics.assets3d.pending, sub: 'Cola de conversión', cls: 'text-amber-600', bg: 'bg-amber-50/30' },
          ].map((k, i) => (
            <div key={i} className={`admin-card p-5 border-slate-200/60 ${k.bg}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${k.cls}`}>{k.val}</span>
                <span className="text-[10px] text-slate-400 font-medium">{k.sub}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros Avanzados */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <AdminTabs
            tabs={statusTabs}
            activeTab={statusFilter}
            onChange={setStatusFilter}
            variant="pills"
          />
        </div>
        <div className="flex gap-2 min-w-[300px]">
          <select 
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-100 focus:outline-none"
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
          >
            <option value="">Todas las marcas...</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input 
            type="text"
            placeholder="Buscar..."
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-100 focus:outline-none"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla Pro */}
      <div className="admin-card overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/20">
        <AdminTable
          columns={columns as any}
          data={filtered}
          loading={isLoading}
          emptyMessage="No se detectan activos con los filtros indicados."
        />
      </div>

      <style jsx>{`
        .admin-card {
           @apply bg-white rounded-2xl border border-slate-100 shadow-sm transition-all;
        }
      `}</style>
    </AdminLayout>
  );
}
