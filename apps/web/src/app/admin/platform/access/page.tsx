/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { usePlatformStore, AccessRelation } from '@/store/admin-platform-store';

export default function PlatformAccessPage() {
  const { accesses, fetchAccesses, isLoading } = usePlatformStore();
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAccesses();
  }, [fetchAccesses]);

  // Filtrar accesos
  const filtered = accesses.filter((a) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (
        !a.tenant?.name?.toLowerCase().includes(q) &&
        !a.distributor?.name?.toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter === 'active' && !a.active) return false;
    if (statusFilter === 'inactive' && a.active) return false;
    return true;
  });

  const columns = [
    { header: 'Fabricante', accessor: (a: AccessRelation) => (
      <span className="font-medium text-slate-800">{a.tenant?.name || a.tenantId.slice(0, 8)}</span>
    )},
    { header: 'Distribuidor', accessor: (a: AccessRelation) => (
      <span className="font-medium text-slate-700">{a.distributor?.name || a.distributorId.slice(0, 8)}</span>
    )},
    { header: 'Estado Acceso', accessor: (a: AccessRelation) => (
      <StatusBadge status={a.active ? 'ACTIVE' : 'INACTIVE'} />
    )},
    { header: 'Estado Distribuidor', accessor: (a: AccessRelation) => (
      <StatusBadge status={a.distributor?.status || 'UNKNOWN'} />
    )},
    { header: 'Lista de Precios', accessor: (a: AccessRelation) => (
      <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
        {a.catalogAccess?.priceListType || 'N/A'}
      </span>
    )},
    { header: 'Fecha Autorización', accessor: (a: AccessRelation) =>
      new Date(a.grantedAt).toLocaleDateString('es-MX')
    },
    { header: 'Expiración', accessor: (a: AccessRelation) =>
      a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('es-MX') : 'Sin expiración'
    },
  ];

  return (
    <AdminLayout type="platform" title="Accesos">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Control de Accesos</h2>
        <p className="text-sm text-slate-500">Relaciones de autorización entre fabricantes y distribuidores, códigos y estado de aceptación.</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{accesses.length}</p>
          <p className="text-xs text-slate-500 mt-1">Relaciones Totales</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{accesses.filter((a) => a.active).length}</p>
          <p className="text-xs text-slate-500 mt-1">Accesos Activos</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-bold text-rose-600">{accesses.filter((a) => !a.active).length}</p>
          <p className="text-xs text-slate-500 mt-1">Accesos Revocados</p>
        </div>
      </div>

      {/* Filtros */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar fabricante o distribuidor...', value: searchFilter },
          { id: 'status', label: 'Estado', type: 'select', value: statusFilter, options: [
            { label: 'Activo', value: 'active' },
            { label: 'Inactivo', value: 'inactive' },
          ]},
        ]}
        onChange={(id, value) => {
          if (id === 'search') setSearchFilter(value);
          if (id === 'status') setStatusFilter(value);
        }}
        onClear={() => { setSearchFilter(''); setStatusFilter(''); }}
        hasActiveFilters={!!searchFilter || !!statusFilter}
      />

      {/* Tabla de accesos */}
      <AdminTable
        columns={columns as any}
        data={filtered}
        loading={isLoading}
        emptyMessage="No se encontraron relaciones de acceso."
      />
    </AdminLayout>
  );
}
