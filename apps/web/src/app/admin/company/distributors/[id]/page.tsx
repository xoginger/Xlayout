/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useDistributorStore, DistributorMarkup } from '@/store/distributor-store';
import { api } from '@/lib/api';

// Detalle de un distribuidor — pestaña de usuarios, accesos y reglas de markup
export default function DistributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { fetchDistributor, setMarkup, deactivateMarkup, revokeCatalogAccess } = useDistributorStore();

  const [distributor, setDistributor] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'accesos' | 'markup'>('usuarios');
  const [isLoading, setIsLoading] = useState(true);

  // Modal crear usuario
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'DESIGNER' as 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES',
  });

  // Modal crear markup
  const [isMarkupOpen, setIsMarkupOpen] = useState(false);
  const [markupForm, setMarkupForm] = useState({
    scope: 'GLOBAL' as 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT',
    markupPercent: 15,
    priority: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDistributor();
  }, [id]);

  const loadDistributor = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDistributor(id);
      setDistributor(data);
    } catch (err) {
      console.error('Error al cargar distribuidor', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear un usuario diseñador dentro de este distribuidor
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/distributor-users', { distributorId: id, ...userForm });
      setIsUserModalOpen(false);
      setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'DESIGNER' });
      loadDistributor(); // Refrescar
    } catch (err) {
      alert('Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Crear regla de markup
  const handleCreateMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await setMarkup(id, markupForm);
      setIsMarkupOpen(false);
      setMarkupForm({ scope: 'GLOBAL', markupPercent: 15, priority: 0 });
      loadDistributor();
    } catch (err) {
      alert('Error al crear regla de markup');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Desactivar markup
  const handleDeactivateMarkup = async (markupId: string) => {
    if (!confirm('¿Desactivar esta regla de markup?')) return;
    try {
      await deactivateMarkup(id, markupId);
      loadDistributor();
    } catch (err) {
      alert('Error al desactivar markup');
    }
  };

  // Revocar acceso
  const handleRevokeAccess = async () => {
    if (!confirm('¿Revocar acceso de este distribuidor a tu catálogo? Los diseñadores ya no podrán ver tus productos.')) return;
    try {
      await revokeCatalogAccess(id);
      loadDistributor();
    } catch (err) {
      alert('Error al revocar acceso');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout type="company" title="Detalle del Distribuidor">
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-slate-400">Cargando distribuidor...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!distributor) {
    return (
      <AdminLayout type="company" title="Distribuidor no encontrado">
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontró el distribuidor solicitado.</p>
          <AdminButton variant="outline" className="mt-4" onClick={() => router.push('/admin/company/distributors')}>
            Volver a Distribuidores
          </AdminButton>
        </div>
      </AdminLayout>
    );
  }

  // Columnas de la tabla de usuarios
  const userColumns = [
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
      accessor: (u: any) => {
        const roleLabels: Record<string, string> = {
          DISTRIBUTOR_ADMIN: 'Administrador',
          DESIGNER: 'Diseñador',
          SALES: 'Vendedor',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            u.role === 'DISTRIBUTOR_ADMIN' ? 'bg-purple-100 text-purple-800' :
            u.role === 'DESIGNER' ? 'bg-blue-100 text-blue-800' :
            'bg-amber-100 text-amber-800'
          }`}>
            {roleLabels[u.role] || u.role}
          </span>
        );
      },
    },
    { header: 'Estado', accessor: (u: any) => <StatusBadge status={u.status} /> },
  ];

  // Columnas de la tabla de accesos a catálogos
  const accessColumns = [
    {
      header: 'Fabricante',
      accessor: (a: any) => (
        <span className="font-semibold text-slate-900">{a.tenant?.name || a.tenantId}</span>
      ),
    },
    {
      header: 'Lista de Precios',
      accessor: (a: any) => (
        <span className="px-3 py-1 text-sm font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          Lista {a.priceListType}
        </span>
      ),
    },
    {
      header: 'Estado',
      accessor: (a: any) => <StatusBadge status={a.active ? 'ACTIVE' : 'INACTIVE'} />,
    },
  ];

  // Columnas de la tabla de markup
  const markupColumns = [
    {
      header: 'Alcance',
      accessor: (m: DistributorMarkup) => {
        const scopeLabels: Record<string, string> = {
          GLOBAL: '🌐 Global',
          BY_TENANT: '🏭 Por Fabricante',
          BY_LINE: '📦 Por Línea',
          BY_PRODUCT: '🎯 Por Producto',
        };
        return <span className="font-medium text-slate-800">{scopeLabels[m.scope] || m.scope}</span>;
      },
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
    {
      header: 'Acciones',
      accessor: (m: DistributorMarkup) => (
        m.active ? (
          <AdminButton variant="outline" size="sm" onClick={() => handleDeactivateMarkup(m.id)}>
            Desactivar
          </AdminButton>
        ) : null
      ),
    },
  ];

  // Pestañas
  const tabs = [
    { key: 'usuarios', label: `Usuarios (${distributor.users?.length || 0})` },
    { key: 'accesos', label: `Accesos (${distributor.catalogAccesses?.length || 0})` },
    { key: 'markup', label: `Markup (${distributor.priceMarkups?.length || 0})` },
  ] as const;

  return (
    <AdminLayout type="company" title={`Distribuidor: ${distributor.name}`}>
      {/* Encabezado con información del distribuidor */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{distributor.name}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span>{distributor.contactEmail || 'Sin email'}</span>
                <span>•</span>
                <span>{distributor.phone || 'Sin teléfono'}</span>
                <span>•</span>
                <span>{distributor.country || 'Sin país'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <AdminButton variant="destructive" size="sm" onClick={handleRevokeAccess}>
              Revocar Acceso
            </AdminButton>
            <AdminButton variant="outline" size="sm" onClick={() => router.push('/admin/company/distributors')}>
              Volver
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'usuarios' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">Diseñadores y administradores de este distribuidor.</p>
            <AdminButton size="sm" onClick={() => setIsUserModalOpen(true)}>
              + Nuevo Usuario
            </AdminButton>
          </div>
          <AdminTable
            columns={userColumns as any}
            data={distributor.users || []}
            emptyMessage="No hay usuarios registrados en este distribuidor."
          />
        </>
      )}

      {activeTab === 'accesos' && (
        <>
          <p className="text-sm text-slate-500 mb-4">Catálogos de fabricantes a los que tiene acceso este distribuidor.</p>
          <AdminTable
            columns={accessColumns as any}
            data={distributor.catalogAccesses || []}
            emptyMessage="Sin accesos a catálogos configurados."
          />
        </>
      )}

      {activeTab === 'markup' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">Reglas de incremento comercial del distribuidor sobre los precios base.</p>
            <AdminButton size="sm" onClick={() => setIsMarkupOpen(true)}>
              + Nueva Regla
            </AdminButton>
          </div>
          <AdminTable
            columns={markupColumns as any}
            data={distributor.priceMarkups || []}
            emptyMessage="Sin reglas de markup definidas. El distribuidor verá los precios base sin incremento."
          />
        </>
      )}

      {/* Modal: Crear Usuario */}
      <AdminModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Nuevo Diseñador / Usuario"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreateUser} loading={isSubmitting}>Crear Usuario</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email" required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              placeholder="diseñador@empresa.com"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
            <input
              type="password" required minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              placeholder="Mínimo 6 caracteres"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
            >
              <option value="DESIGNER">Diseñador — usa el editor, ve catálogos</option>
              <option value="SALES">Vendedor — genera cotizaciones</option>
              <option value="DISTRIBUTOR_ADMIN">Administrador — gestiona configuración</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>

      {/* Modal: Crear Regla de Markup */}
      <AdminModal
        isOpen={isMarkupOpen}
        onClose={() => setIsMarkupOpen(false)}
        title="Nueva Regla de Incremento"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsMarkupOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreateMarkup} loading={isSubmitting}>Crear Regla</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreateMarkup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alcance</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={markupForm.scope}
              onChange={(e) => setMarkupForm({ ...markupForm, scope: e.target.value as any })}
            >
              <option value="GLOBAL">Global — aplica a todos los productos</option>
              <option value="BY_TENANT">Por Fabricante — aplica a un fabricante específico</option>
              <option value="BY_LINE">Por Línea — aplica a una línea de productos</option>
              <option value="BY_PRODUCT">Por Producto — aplica a un producto específico</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Incremento (%)</label>
              <div className="relative">
                <input
                  type="number" step="0.1" min="0" max="500" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 pr-8"
                  value={markupForm.markupPercent}
                  onChange={(e) => setMarkupForm({ ...markupForm, markupPercent: parseFloat(e.target.value) || 0 })}
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-sm">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ej: 15% sobre precio base de $1,000 = precio venta $1,150
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <input
                type="number" min="0" max="100"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
                value={markupForm.priority}
                onChange={(e) => setMarkupForm({ ...markupForm, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500 mt-1">Mayor prioridad = se aplica primero</p>
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
