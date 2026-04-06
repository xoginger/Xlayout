/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { StatCard } from '@/components/admin/StatCard';
import { useDistributorStore, DistributorCompany } from '@/store/distributor-store';
import { useRouter } from 'next/navigation';

// Página principal de gestión de distribuidores — visible para el fabricante (COMPANY_USER)
export default function CompanyDistributorsPage() {
  const router = useRouter();
  const {
    distributors,
    isLoading,
    fetchDistributors,
    createDistributor,
    grantCatalogAccess,
  } = useDistributorStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de creación de distribuidor
  const [createForm, setCreateForm] = useState({
    name: '',
    contactEmail: '',
    phone: '',
    country: '',
  });

  // Formulario de asignación de acceso
  const [grantForm, setGrantForm] = useState({
    priceListType: 'A',
    notes: '',
  });

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  // Crear distribuidor y asignar acceso al catálogo
  const handleCreateDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name) return;
    setIsSubmitting(true);
    try {
      const newDist = await createDistributor(createForm);
      setIsCreateOpen(false);
      setCreateForm({ name: '', contactEmail: '', phone: '', country: '' });
      // Abrir el modal de asignación de acceso automáticamente
      setSelectedDistId(newDist.id);
      setIsGrantOpen(true);
    } catch (err) {
      alert('Error al crear distribuidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Asignar acceso al catálogo del fabricante actual
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistId) return;
    setIsSubmitting(true);
    try {
      await grantCatalogAccess(selectedDistId, grantForm.priceListType, grantForm.notes);
      setIsGrantOpen(false);
      setGrantForm({ priceListType: 'A', notes: '' });
      fetchDistributors(); // Refrescar lista
    } catch (err) {
      alert('Error al asignar acceso');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columnas de la tabla de distribuidores
  const columns = [
    {
      header: 'Empresa',
      accessor: (d: DistributorCompany) => (
        <div>
          <span className="font-semibold block text-slate-900">{d.name}</span>
          <span className="text-xs text-slate-500">{d.slug}</span>
        </div>
      ),
    },
    {
      header: 'Contacto',
      accessor: (d: DistributorCompany) => (
        <div className="text-sm">
          <div className="text-slate-700">{d.contactEmail || '—'}</div>
          <div className="text-xs text-slate-400">{d.phone || ''}</div>
        </div>
      ),
    },
    {
      header: 'País',
      accessor: (d: DistributorCompany) => (
        <span className="text-sm text-slate-600">{d.country || '—'}</span>
      ),
    },
    {
      header: 'Usuarios',
      accessor: (d: DistributorCompany) => (
        <span className="text-sm font-medium text-slate-700">
          {d._count?.users ?? 0}
        </span>
      ),
      className: 'text-center',
    },
    {
      header: 'Accesos',
      accessor: (d: DistributorCompany) => (
        <span className="text-sm font-medium text-slate-700">
          {d._count?.manufacturerAccesses ?? 0}
        </span>
      ),
      className: 'text-center',
    },
    {
      header: 'Estado',
      accessor: (d: DistributorCompany) => <StatusBadge status={d.status} />,
    },
    {
      header: 'Acciones',
      accessor: (d: DistributorCompany) => (
        <div className="flex gap-2">
          <AdminButton
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDistId(d.id);
              setIsGrantOpen(true);
            }}
          >
            Asignar Acceso
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout type="company" title="Distribuidores">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Distribuidores"
          value={String(distributors.length)}
        />
        <StatCard
          label="Diseñadores Registrados"
          value={String(distributors.reduce((acc, d) => acc + (d._count?.users ?? 0), 0))}
        />
        <StatCard
          label="Accesos Activos"
          value={String(distributors.reduce((acc, d) => acc + (d._count?.manufacturerAccesses ?? 0), 0))}
        />
      </div>

      {/* Encabezado + botón crear */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Red de Distribuidores</h2>
          <p className="text-sm text-slate-500">
            Gestiona empresas distribuidoras autorizadas para vender tu catálogo.
          </p>
        </div>
        <AdminButton
          onClick={() => setIsCreateOpen(true)}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          Nuevo Distribuidor
        </AdminButton>
      </div>

      {/* Tabla de distribuidores */}
      <AdminTable
        columns={columns as any}
        data={distributors}
        loading={isLoading}
        emptyMessage="No hay distribuidores registrados. Crea el primero para empezar."
        onRowClick={(d) => router.push(`/admin/company/distributors/${d.id}`)}
      />

      {/* Modal: Crear Distribuidor */}
      <AdminModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nuevo Distribuidor"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreateDistributor} loading={isSubmitting}>Crear Distribuidor</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreateDistributor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ej: Distribuidora Norte SA"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email de Contacto</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                placeholder="contacto@empresa.com"
                value={createForm.contactEmail}
                onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                placeholder="+52 55 1234 5678"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={createForm.country}
              onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
            >
              <option value="">Seleccionar país...</option>
              <option value="MX">México</option>
              <option value="US">Estados Unidos</option>
              <option value="CO">Colombia</option>
              <option value="AR">Argentina</option>
              <option value="ES">España</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>

      {/* Modal: Asignar Acceso al Catálogo */}
      <AdminModal
        isOpen={isGrantOpen}
        onClose={() => setIsGrantOpen(false)}
        title="Asignar Acceso al Catálogo"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsGrantOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleGrantAccess} loading={isSubmitting}>Asignar Acceso</AdminButton>
          </>
        }
      >
        <form onSubmit={handleGrantAccess} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lista de Precios Asignada</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={grantForm.priceListType}
              onChange={(e) => setGrantForm({ ...grantForm, priceListType: e.target.value })}
            >
              <option value="A">Lista A — Precio base / mayorista</option>
              <option value="B">Lista B — Precio preferencial</option>
              <option value="C">Lista C — Precio estándar</option>
              <option value="D">Lista D — Precio público</option>
              <option value="E">Lista E — Precio premium</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              El distribuidor verá únicamente los precios de la lista seleccionada.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              rows={3}
              placeholder="Notas internas sobre este acceso..."
              value={grantForm.notes}
              onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
            />
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
