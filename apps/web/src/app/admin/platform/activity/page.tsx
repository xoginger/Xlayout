/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { usePlatformStore, AuditEntry } from '@/store/admin-platform-store';

// Acciones críticas que deben destacarse visualmente
const CRITICAL_ACTIONS = [
  'SUSPEND_TENANT', 'DEACTIVATE_TENANT',
  'REVOKE_ACCESS', 'SUSPEND_USER',
  'IMPORT_FAILED', 'CONVERSION_FAILED',
  'DELETE_PRODUCT', 'CHANGE_PRICE',
];

// Etiquetas legibles para tipos de actor
const actorTypeLabels: Record<string, string> = {
  PLATFORM_USER: 'Plataforma',
  COMPANY_USER: 'Marca',
  DISTRIBUTOR_USER: 'Distribuidor',
  END_USER: 'Usuario Final',
  SYSTEM: 'Sistema',
};

export default function PlatformActivityPage() {
  const { auditLogs, fetchAuditLogs, isLoading } = usePlatformStore();
  const [actorTypeFilter, setActorTypeFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Aplicar filtros y pasar al backend cuando sea posible
  const handleFilterChange = (id: string, value: string) => {
    if (id === 'actorType') setActorTypeFilter(value);
    if (id === 'entityType') setEntityTypeFilter(value);
    if (id === 'search') setSearchFilter(value);
  };

  // Filtrar localmente para búsqueda
  const filtered = auditLogs.filter((l) => {
    if (actorTypeFilter && l.actorType !== actorTypeFilter) return false;
    if (entityTypeFilter && l.entityType !== entityTypeFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!l.action.toLowerCase().includes(q) && !l.entityType.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Determinar si una acción es crítica
  const isCritical = (action: string) =>
    CRITICAL_ACTIONS.some((ca) => action.toUpperCase().includes(ca));

  // Estilos de badge por tipo de actor
  const actorBadgeColors: Record<string, string> = {
    PLATFORM_USER: 'bg-indigo-100 text-indigo-700',
    COMPANY_USER: 'bg-blue-100 text-blue-700',
    DISTRIBUTOR_USER: 'bg-emerald-100 text-emerald-700',
    END_USER: 'bg-slate-100 text-slate-600',
    SYSTEM: 'bg-purple-100 text-purple-700',
  };

  // Tipos de entidad únicos en los logs actuales
  const entityTypes = [...new Set(auditLogs.map((l) => l.entityType))].sort();

  const columns = [
    { header: 'Fecha/Hora', accessor: (l: AuditEntry) => (
      <span className="text-xs text-slate-600 whitespace-nowrap">
        {new Date(l.createdAt).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </span>
    )},
    { header: 'Actor', accessor: (l: AuditEntry) => (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${actorBadgeColors[l.actorType] || 'bg-slate-100 text-slate-600'}`}>
        {actorTypeLabels[l.actorType] || l.actorType}
      </span>
    )},
    { header: 'Acción', accessor: (l: AuditEntry) => (
      <span className={`font-mono text-xs px-2 py-1 rounded ${
        isCritical(l.action) ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold' : 'bg-slate-100 text-slate-800'
      }`}>
        {l.action}
      </span>
    )},
    { header: 'Entidad', accessor: (l: AuditEntry) => (
      <span className="text-xs text-slate-600">{l.entityType}</span>
    )},
    { header: 'ID Actor', accessor: (l: AuditEntry) => (
      <span className="text-xs text-slate-400 font-mono" title={l.actorId}>{l.actorId.slice(0, 8)}...</span>
    )},
    { header: 'Detalle', accessor: (l: AuditEntry) => (
      l.payload ? (
        <span className="text-xs text-slate-500 max-w-[200px] truncate block" title={JSON.stringify(l.payload)}>
          {JSON.stringify(l.payload).slice(0, 60)}...
        </span>
      ) : <span className="text-xs text-slate-400">-</span>
    )},
  ];

  return (
    <AdminLayout type="platform" title="Actividad">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Log de Actividad</h2>
        <p className="text-sm text-slate-500">
          Auditoría global de eventos significativos en la plataforma.
          {' '}<span className="text-xs bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-200">Eventos críticos</span> se destacan visualmente.
        </p>
      </div>

      {/* Filtros */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar acción o entidad...', value: searchFilter },
          { id: 'actorType', label: 'Actor', type: 'select', value: actorTypeFilter, options: [
            { label: 'Plataforma', value: 'PLATFORM_USER' },
            { label: 'Marca', value: 'COMPANY_USER' },
            { label: 'Distribuidor', value: 'DISTRIBUTOR_USER' },
            { label: 'Sistema', value: 'SYSTEM' },
          ]},
          { id: 'entityType', label: 'Entidad', type: 'select', value: entityTypeFilter, options:
            entityTypes.map((et) => ({ label: et, value: et }))
          },
        ]}
        onChange={handleFilterChange}
        onClear={() => { setActorTypeFilter(''); setEntityTypeFilter(''); setSearchFilter(''); }}
        hasActiveFilters={!!actorTypeFilter || !!entityTypeFilter || !!searchFilter}
      />

      {/* Tabla de actividad */}
      <AdminTable
        columns={columns as any}
        data={filtered}
        loading={isLoading}
        emptyMessage="No se encontraron logs de actividad con estos filtros."
      />
    </AdminLayout>
  );
}
