/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { usePlatformStore, Tenant } from '@/store/admin-platform-store';

export default function PlatformTenantsPage() {
  const { tenants, fetchTenants, createTenant, suspendTenant, activateTenant, updateTenantStatus, isLoading } = usePlatformStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [drawerTab, setDrawerTab] = useState('general');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [newTenant, setNewTenant] = useState({
    name: '', slug: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTenant(newTenant);
      setIsModalOpen(false);
      setNewTenant({ name: '', slug: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' });
    } catch (err: any) {
      alert(err.message || 'Error al crear la marca');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar tenants según búsqueda y estado
  const filteredTenants = tenants.filter((t) => {
    if (searchFilter && !t.name.toLowerCase().includes(searchFilter.toLowerCase()) && !t.slug.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = async (tenant: Tenant, newStatus: string) => {
    try {
      await updateTenantStatus(tenant.id, newStatus);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const columns = [
    { header: 'Nombre', accessor: (t: Tenant) => (
      <button onClick={() => setSelectedTenant(t)} className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-left">
        {t.name}
      </button>
    )},
    { header: 'Slug', accessor: (t: Tenant) => <span className="font-mono text-xs text-slate-500">{t.slug}</span> },
    { header: 'Estado', accessor: (t: Tenant) => <StatusBadge status={t.status} /> },
    { header: 'Creación', accessor: (t: Tenant) => new Date(t.createdAt).toLocaleDateString('es-MX') },
    {
      header: 'Acciones',
      accessor: (t: Tenant) => (
        <div className="flex gap-2">
          <AdminButton variant="ghost" size="sm" onClick={() => setSelectedTenant(t)}>
            Ver
          </AdminButton>
          {t.status === 'ACTIVE' && (
            <AdminButton variant="outline" size="sm" onClick={() => handleStatusChange(t, 'SUSPENDED')}>
              Suspender
            </AdminButton>
          )}
          {t.status === 'SUSPENDED' && (
            <AdminButton variant="primary" size="sm" onClick={() => handleStatusChange(t, 'ACTIVE')}>
              Reactivar
            </AdminButton>
          )}
          {t.status === 'PENDING' && (
            <AdminButton variant="primary" size="sm" onClick={() => handleStatusChange(t, 'ACTIVE')}>
              Activar
            </AdminButton>
          )}
          {t.status !== 'INACTIVE' && (
            <AdminButton variant="destructive" size="sm" onClick={() => {
              if (confirm('¿Dar de baja lógica a esta marca? Esta acción la desactivará.')) {
                handleStatusChange(t, 'INACTIVE');
              }
            }}>
              Baja
            </AdminButton>
          )}
        </div>
      )
    },
  ];

  // Tabs del drawer de detalle
  const drawerTabs = [
    { id: 'general', label: 'General' },
    { id: 'users', label: 'Usuarios' },
    { id: 'catalog', label: 'Catálogo' },
    { id: 'distributors', label: 'Distribuidores' },
    { id: 'activity', label: 'Actividad' },
  ];

  return (
    <AdminLayout type="platform" title="Marcas">
      {/* Cabecera y acciones */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestión de Marcas</h2>
          <p className="text-sm text-slate-500">Administra fabricantes, su estado y sus recursos.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        }>
          Crear Marca
        </AdminButton>
      </div>

      {/* Filtros */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar por nombre o slug...', value: searchFilter },
          { id: 'status', label: 'Estado', type: 'select', value: statusFilter, options: [
            { label: 'Activo', value: 'ACTIVE' },
            { label: 'Suspendido', value: 'SUSPENDED' },
            { label: 'Pendiente', value: 'PENDING' },
            { label: 'Inactivo', value: 'INACTIVE' },
          ]},
        ]}
        onChange={(id, value) => {
          if (id === 'search') setSearchFilter(value);
          if (id === 'status') setStatusFilter(value);
        }}
        onClear={() => { setSearchFilter(''); setStatusFilter(''); }}
        hasActiveFilters={!!searchFilter || !!statusFilter}
      />

      {/* Tabla de marcas */}
      <AdminTable
        columns={columns as any}
        data={filteredTenants}
        loading={isLoading}
        emptyMessage="No se encontraron marcas. ¡Crea la primera!"
        onRowClick={(t) => setSelectedTenant(t)}
      />

      {/* Modal para crear marca */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Marca"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Crear Marca</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="border-b border-slate-200 pb-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Datos de la Marca</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Marca</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ej. Herman Miller"
                  value={newTenant.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewTenant({ ...newTenant, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug (Identificador URL)</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500"
                  value={newTenant.slug} readOnly
                />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Administrador Inicial de la Marca</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminFirstName} onChange={(e) => setNewTenant({ ...newTenant, adminFirstName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminLastName} onChange={(e) => setNewTenant({ ...newTenant, adminLastName: e.target.value })} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email del Admin</label>
              <input type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminEmail} onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal</label>
              <input type="password" required minLength={8} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminPassword} onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>

      {/* Drawer de detalle de marca */}
      <AdminDrawer
        isOpen={!!selectedTenant}
        onClose={() => setSelectedTenant(null)}
        title={selectedTenant?.name || ''}
        subtitle={selectedTenant?.slug}
        width="xl"
      >
        {selectedTenant && (
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
                      <StatusBadge status={selectedTenant.status} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Fecha de Creación</p>
                      <p className="text-sm text-slate-700">{new Date(selectedTenant.createdAt).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Email de Contacto</p>
                      <p className="text-sm text-slate-700">{selectedTenant.contactEmail || 'No definido'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Slug</p>
                      <p className="text-sm text-slate-700 font-mono">{selectedTenant.slug}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                    {selectedTenant.status === 'ACTIVE' && (
                      <AdminButton variant="outline" size="sm" onClick={() => handleStatusChange(selectedTenant, 'SUSPENDED')}>Suspender</AdminButton>
                    )}
                    {selectedTenant.status === 'SUSPENDED' && (
                      <AdminButton variant="primary" size="sm" onClick={() => handleStatusChange(selectedTenant, 'ACTIVE')}>Reactivar</AdminButton>
                    )}
                    {selectedTenant.status !== 'INACTIVE' && (
                      <AdminButton variant="destructive" size="sm" onClick={() => {
                        if (confirm('¿Dar de baja lógica?')) handleStatusChange(selectedTenant, 'INACTIVE');
                      }}>Baja Lógica</AdminButton>
                    )}
                  </div>
                </div>
              )}
              {drawerTab === 'users' && (
                <div className="text-sm text-slate-500 italic">
                  <p className="mb-2">Los usuarios internos de esta marca se cargarán desde el endpoint de company users.</p>
                  <p className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-700">
                    ⚠️ Pendiente: endpoint para listar company users por tenantId desde plataforma.
                  </p>
                </div>
              )}
              {drawerTab === 'catalog' && (
                <div className="text-sm text-slate-500 italic">
                  <p className="mb-2">El catálogo de esta marca muestra productos, líneas y categorías.</p>
                  <p className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-700">
                    ⚠️ Pendiente: vista de catálogo resumido por marca desde plataforma.
                  </p>
                </div>
              )}
              {drawerTab === 'distributors' && (
                <div className="text-sm text-slate-500 italic">
                  <p className="mb-2">Distribuidores que tienen acceso al catálogo de esta marca.</p>
                  <p className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-700">
                    ⚠️ Pendiente: endpoint para listar distribuidores por tenantId desde plataforma.
                  </p>
                </div>
              )}
              {drawerTab === 'activity' && (
                <div className="text-sm text-slate-500 italic">
                  <p className="mb-2">Historial de actividad reciente de esta marca.</p>
                  <p className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-700">
                    ⚠️ Pendiente: filtrar audit logs por tenantId desde plataforma.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminLayout>
  );
}
