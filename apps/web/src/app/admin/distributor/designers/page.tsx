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
import { api } from '@/lib/api';

// Listado de diseñadores y vendedores del distribuidor — solo visible para DISTRIBUTOR_ADMIN
export default function DistributorDesignersPage() {
  const { user } = useAuthStore();
  const distributorId = user?.distributorId;
  const isAdmin = user?.distributorRole === 'DISTRIBUTOR_ADMIN';

  const [designers, setDesigners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'DESIGNER' as 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES',
  });

  useEffect(() => {
    loadDesigners();
  }, [distributorId]);

  const loadDesigners = async () => {
    if (!distributorId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any[]>(`/distributor-users/by-distributor/${distributorId}`);
      setDesigners(data);
    } catch (err) {
      console.error('Error al cargar diseñadores', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear un nuevo diseñador
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributorId) return;
    setIsSubmitting(true);
    try {
      await api.post('/distributor-users', { distributorId, ...form });
      setIsModalOpen(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'DESIGNER' });
      loadDesigners();
    } catch (err) {
      alert('Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Etiquetas de rol legibles
  const roleLabels: Record<string, string> = {
    DISTRIBUTOR_ADMIN: 'Administrador',
    DESIGNER: 'Diseñador',
    SALES: 'Vendedor',
  };

  const roleColors: Record<string, string> = {
    DISTRIBUTOR_ADMIN: 'bg-purple-100 text-purple-800',
    DESIGNER: 'bg-blue-100 text-blue-800',
    SALES: 'bg-amber-100 text-amber-800',
  };

  const columns = [
    {
      header: 'Nombre',
      accessor: (u: any) => (
        <div>
          <span className="font-semibold text-slate-900">{u.firstName} {u.lastName}</span>
          <span className="block text-xs text-slate-500">{u.email}</span>
        </div>
      ),
    },
    {
      header: 'Rol',
      accessor: (u: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[u.role] || 'bg-slate-100 text-slate-800'}`}>
          {roleLabels[u.role] || u.role}
        </span>
      ),
    },
    {
      header: 'Estado',
      accessor: (u: any) => <StatusBadge status={u.status} />,
    },
    {
      header: 'Registrado',
      accessor: (u: any) => (
        <span className="text-sm text-slate-500">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-MX') : '—'}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout type="distributor" title="Diseñadores y Equipo">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Equipo del Distribuidor</h2>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Gestiona diseñadores, vendedores y administradores de tu empresa.'
              : 'Compañeros de tu empresa distribuidora.'}
          </p>
        </div>
        {isAdmin && (
          <AdminButton onClick={() => setIsModalOpen(true)}>
            + Nuevo Usuario
          </AdminButton>
        )}
      </div>

      <AdminTable
        columns={columns as any}
        data={designers}
        loading={isLoading}
        emptyMessage="No hay usuarios registrados. Crea el primer diseñador para empezar."
      />

      {/* Modal: Crear Usuario */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Miembro del Equipo"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Crear Usuario</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email" required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              placeholder="usuario@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
            <input
              type="password" required minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
            >
              <option value="DESIGNER">Diseñador — usa el editor 3D</option>
              <option value="SALES">Vendedor — genera cotizaciones</option>
              <option value="DISTRIBUTOR_ADMIN">Administrador — gestiona configuración</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
