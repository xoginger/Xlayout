/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { usePlatformStore } from '@/store/admin-platform-store';
import { api } from '@/lib/api';

// Tipos de usuario para las pestañas
const USER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'PLATFORM_USER', label: 'Plataforma' },
  { id: 'COMPANY_USER', label: 'Marcas' },
  { id: 'DISTRIBUTOR_USER', label: 'Distribuidores' },
  { id: 'END_USER', label: 'Usuarios Finales' },
];

export default function PlatformUsersPage() {
  const { allUsers, fetchAllUsers, isLoading } = usePlatformStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' });

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Filtrar usuarios
  const filtered = allUsers.filter((u) => {
    if (typeFilter !== 'all' && u.userType !== typeFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      if (!name.includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCreatePlatformUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/platform-users', formData);
      setIsModalOpen(false);
      setFormData({ email: '', password: '', firstName: '', lastName: '' });
      fetchAllUsers();
    } catch (err: any) {
      alert(err.message || 'Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (user: any, newStatus: string) => {
    try {
      if (user.userType === 'PLATFORM_USER') {
        await api.patch(`/platform-users/${user.id}/status`, { status: newStatus });
      }
      // Otros tipos pendientes de endpoint global
      fetchAllUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  // Mapear tipo de usuario a etiqueta legible
  const userTypeLabels: Record<string, string> = {
    PLATFORM_USER: 'Plataforma',
    COMPANY_USER: 'Marca',
    DISTRIBUTOR_USER: 'Distribuidor',
    END_USER: 'Usuario Final',
  };

  const userTypeBadgeColors: Record<string, string> = {
    PLATFORM_USER: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    COMPANY_USER: 'bg-blue-100 text-blue-700 border-blue-200',
    DISTRIBUTOR_USER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    END_USER: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const columns = [
    { header: 'Nombre', accessor: (u: any) => (
      <div>
        <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
        <p className="text-xs text-slate-500">{u.email}</p>
      </div>
    )},
    { header: 'Tipo', accessor: (u: any) => (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${userTypeBadgeColors[u.userType] || 'bg-slate-100 text-slate-600'}`}>
        {userTypeLabels[u.userType] || u.userType}
      </span>
    )},
    { header: 'Rol', accessor: (u: any) => (
      <span className="text-sm text-slate-600">{u.role || '-'}</span>
    )},
    { header: 'Estado', accessor: (u: any) => <StatusBadge status={u.status} /> },
    { header: 'Creación', accessor: (u: any) => new Date(u.createdAt).toLocaleDateString('es-MX') },
    {
      header: 'Acciones',
      accessor: (u: any) => (
        <div className="flex gap-2">
          {u.status === 'ACTIVE' && (
            <AdminButton variant="outline" size="sm" onClick={() => updateStatus(u, 'SUSPENDED')}>Suspender</AdminButton>
          )}
          {(u.status === 'SUSPENDED' || u.status === 'INACTIVE') && (
            <AdminButton variant="primary" size="sm" onClick={() => updateStatus(u, 'ACTIVE')}>Reactivar</AdminButton>
          )}
        </div>
      )
    },
  ];

  return (
    <AdminLayout type="platform" title="Usuarios">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestión de Usuarios</h2>
          <p className="text-sm text-slate-500">Todos los usuarios de la plataforma agrupados por tipo.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
        }>
          Crear Admin
        </AdminButton>
      </div>

      {/* Tabs por tipo de usuario */}
      <AdminTabs
        tabs={USER_TABS.map((t) => ({
          ...t,
          count: t.id === 'all' ? allUsers.length : allUsers.filter((u) => u.userType === t.id).length,
        }))}
        activeTab={typeFilter}
        onChange={setTypeFilter}
        variant="pills"
      />

      {/* Filtros adicionales */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar por nombre o email...', value: searchFilter },
          { id: 'status', label: 'Estado', type: 'select', value: statusFilter, options: [
            { label: 'Activo', value: 'ACTIVE' },
            { label: 'Suspendido', value: 'SUSPENDED' },
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

      {/* Tabla */}
      <AdminTable
        columns={columns as any}
        data={filtered}
        loading={isLoading}
        emptyMessage="No se encontraron usuarios con estos filtros."
      />

      {/* Modal crear admin de plataforma */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Administrador de Plataforma"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreatePlatformUser} loading={isSubmitting}>Crear Admin</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreatePlatformUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal</label>
            <input type="password" required minLength={8} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
