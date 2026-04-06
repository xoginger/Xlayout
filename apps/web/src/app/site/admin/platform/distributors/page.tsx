/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { usePlatformStore, Distributor } from '@/store/admin-platform-store';

export default function PlatformDistributorsPage() {
  const { distributors, fetchDistributors, isLoading } = usePlatformStore();
  const [selectedDist, setSelectedDist] = useState<Distributor | null>(null);
  const [drawerTab, setDrawerTab] = useState('general');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  // Filtrar distribuidores
  const filtered = distributors.filter((d) => {
    if (searchFilter && !d.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  const columns = [
    { header: 'Empresa', accessor: (d: Distributor) => (
      <button onClick={() => setSelectedDist(d)} className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-left">
        {d.name}
      </button>
    )},
    { header: 'Contacto', accessor: (d: Distributor) => (
      <span className="text-sm text-slate-600">{d.contactEmail || '-'}</span>
    )},
    { header: 'País', accessor: (d: Distributor) => (
      <span className="text-sm text-slate-600">{d.country || '-'}</span>
    )},
    { header: 'Estado', accessor: (d: Distributor) => <StatusBadge status={d.status} /> },
    { header: 'Alta', accessor: (d: Distributor) => new Date(d.createdAt).toLocaleDateString('es-MX') },
    {
      header: 'Acciones',
      accessor: (d: Distributor) => (
        <div className="flex gap-2">
          <AdminButton variant="ghost" size="sm" onClick={() => setSelectedDist(d)}>Ver</AdminButton>
        </div>
      )
    },
  ];

  const drawerTabs = [
    { id: 'general', label: 'General' },
    { id: 'users', label: 'Usuarios' },
    { id: 'brands', label: 'Accesos a Marcas' },
    { id: 'markups', label: 'Markups' },
    { id: 'activity', label: 'Actividad' },
  ];

  return (
    <AdminLayout type="platform" title="Distribuidores">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Red de Distribuidores</h2>
          <p className="text-sm text-slate-500">Vista global de todos los distribuidores registrados en la plataforma.</p>
        </div>
      </div>

      {/* Filtros */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar distribuidor...', value: searchFilter },
          { id: 'status', label: 'Estado', type: 'select', value: statusFilter, options: [
            { label: 'Activo', value: 'ACTIVE' },
            { label: 'Inactivo', value: 'INACTIVE' },
            { label: 'Suspendido', value: 'SUSPENDED' },
          ]},
        ]}
        onChange={(id, value) => {
          if (id === 'search') setSearchFilter(value);
          if (id === 'status') setStatusFilter(value);
        }}
        onClear={() => { setSearchFilter(''); setStatusFilter(''); }}
        hasActiveFilters={!!searchFilter || !!statusFilter}
      />

      {/* Tabla de distribuidores */}
      <AdminTable
        columns={columns as any}
        data={filtered}
        loading={isLoading}
        emptyMessage="No se encontraron distribuidores."
        onRowClick={(d) => setSelectedDist(d)}
      />

      {/* Drawer detalle */}
      <AdminDrawer
        isOpen={!!selectedDist}
        onClose={() => setSelectedDist(null)}
        title={selectedDist?.name || ''}
        subtitle={selectedDist?.slug}
        width="xl"
      >
        {selectedDist && (
          <div>
            <div className="px-6 pt-4">
              <AdminTabs tabs={drawerTabs} activeTab={drawerTab} onChange={setDrawerTab} />
            </div>
            <div className="p-6">
              {drawerTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Estado</p>
                      <StatusBadge status={selectedDist.status} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Fecha de Alta</p>
                      <p className="text-sm text-slate-700">{new Date(selectedDist.createdAt).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Email de Contacto</p>
                      <p className="text-sm text-slate-700">{selectedDist.contactEmail || 'No definido'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Teléfono</p>
                      <p className="text-sm text-slate-700">{selectedDist.phone || 'No definido'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">País</p>
                      <p className="text-sm text-slate-700">{selectedDist.country || 'No definido'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Slug</p>
                      <p className="text-sm text-slate-700 font-mono">{selectedDist.slug}</p>
                    </div>
                  </div>
                </div>
              )}
              {drawerTab === 'users' && (
                <p className="text-sm text-slate-500 italic">
                  <span className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 block text-amber-700">
                    ⚠️ Pendiente: cargar usuarios internos del distribuidor desde el endpoint /distributor-users/by-distributor/:id.
                  </span>
                </p>
              )}
              {drawerTab === 'brands' && (
                <p className="text-sm text-slate-500 italic">
                  <span className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 block text-amber-700">
                    ⚠️ Pendiente: mostrar marcas que le dieron acceso a este distribuidor.
                  </span>
                </p>
              )}
              {drawerTab === 'markups' && (
                <p className="text-sm text-slate-500 italic">
                  <span className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 block text-amber-700">
                    ⚠️ Pendiente: mostrar reglas de markup del distribuidor.
                  </span>
                </p>
              )}
              {drawerTab === 'activity' && (
                <p className="text-sm text-slate-500 italic">
                  <span className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 block text-amber-700">
                    ⚠️ Pendiente: filtrar actividad por distribuidor.
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminLayout>
  );
}
