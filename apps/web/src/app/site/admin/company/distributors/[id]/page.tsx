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
import { useDistributorStore, DistributorRelationshipSummary } from '@/store/distributor-store';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';

// Detalle de un distribuidor para el Fabricante
export default function DistributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;

  const { fetchDistributor, fetchRelationshipSummary, assignAllowedPriceLists, assignDiscount, revokeCatalogAccess } = useDistributorStore();

  const [distributor, setDistributor] = useState<any>(null);
  const [relationship, setRelationship] = useState<DistributorRelationshipSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'comercial'>('comercial');
  const [isLoading, setIsLoading] = useState(true);

  // Estados visuales de Reglas Comerciales
  const [listsState, setListsState] = useState<string[]>(['A']);
  const [defaultListState, setDefaultListState] = useState<string>('A');
  const [discountState, setDiscountState] = useState<number>(0);
  const [isSavingComercial, setIsSavingComercial] = useState(false);

  // Modal crear usuario
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'DESIGNER' as 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id && tenantId) {
      loadData();
    }
  }, [id, tenantId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [distData, relData] = await Promise.all([
        fetchDistributor(id as string),
        fetchRelationshipSummary(id as string, tenantId!)
      ]);
      setDistributor(distData);
      setRelationship(relData);

      // Sincronizar estado local de la relación
      setListsState(relData.allowedPriceLists.length > 0 ? relData.allowedPriceLists : ['A']);
      setDefaultListState(relData.defaultPriceList || 'A');
      setDiscountState(relData.globalDiscountPercent || 0);

    } catch (err) {
      console.error('Error al cargar distribuidor/relación', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveComercialRules = async () => {
    if (!tenantId || listsState.length === 0) {
       alert("Debes seleccionar al menos una lista autorizada.");
       return;
    }
    
    // Asegurar que defaultListState esté dentro de las listsState
    const finalDefault = listsState.includes(defaultListState) ? defaultListState : listsState[0];
    
    setIsSavingComercial(true);
    try {
      // 1. Guardar listas permitidas
      const payloadLists = listsState.map(l => ({
        priceListType: l,
        isDefault: l === finalDefault
      }));
      await assignAllowedPriceLists(id as string, payloadLists);

      // 2. Guardar descuento global
      if (discountState >= 0 && discountState <= 100) {
         await assignDiscount(id as string, {
            scope: 'GLOBAL',
            discountPercent: discountState
         });
      }

      await loadData(); // Refrescar estado para confirmar éxito
      alert('Reglas comerciales actualizadas correctamente.');
    } catch (err: any) {
      alert('Hubo un error guardando las reglas comerciales: ' + err.message);
    } finally {
      setIsSavingComercial(false);
    }
  };

  const toggleList = (list: string) => {
    if (listsState.includes(list)) {
      setListsState(listsState.filter(l => l !== list));
    } else {
      setListsState([...listsState, list]);
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
      loadData(); // Refrescar
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear usuario';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revocar acceso total
  const handleRevokeAccess = async () => {
    if (!confirm('¿Revocar acceso total de este distribuidor a tu catálogo? Todas las reglas comerciales se perderán y los diseñadores ya no podrán ver tus productos.')) return;
    try {
      await revokeCatalogAccess(id as string);
      loadData();
    } catch (err) {
      alert('Error al revocar acceso');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout type="company" title="Detalle de Relación Comercial">
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-slate-400">Cargando perfil comercial...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!distributor) {
    return (
      <AdminLayout type="company" title="Distribuidor no encontrado">
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontró el distribuidor o no tienes acceso.</p>
          <AdminButton variant="outline" className="mt-4" onClick={() => router.push('/site/admin/company/distributors')}>
            Volver a Distribuidores
          </AdminButton>
        </div>
      </AdminLayout>
    );
  }

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

  return (
    <AdminLayout type="company" title={`Relación Comercial: ${distributor.name}`}>
      {/* Encabezado con información del distribuidor */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center border border-emerald-200">
              <span className="text-emerald-700 font-bold text-2xl">
                {distributor.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{distributor.name}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span>{distributor.contactEmail || 'Sin email configurado'}</span>
                <span>•</span>
                <span>{distributor.phone || 'Sin teléfono'}</span>
                <span>•</span>
                <span className="font-medium text-slate-700">{distributor.plan === 'PRO' ? 'Plan PRO' : 'Plan Standard'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!relationship?.hasAccess ? (
               <AdminButton variant="primary" size="sm" onClick={() => handleSaveComercialRules()}>
                 Otorgar Acceso
               </AdminButton>
            ) : (
               <AdminButton variant="destructive" size="sm" onClick={handleRevokeAccess}>
                 Revocar Acceso
               </AdminButton>
            )}
            <AdminButton variant="outline" size="sm" onClick={() => router.push('/site/admin/company/distributors')}>
              Volver
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Pestañas (Modificadas) */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit shadow-inner">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'comercial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('comercial')}
        >
           Reglas Comerciales
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'usuarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('usuarios')}
        >
           Personal / Diseñadores ({distributor.users?.length || 0})
        </button>
      </div>

      {activeTab === 'comercial' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Configuración del Motor de Precios</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Define las reglas a través de las cuales este distribuidor consumirá tu catálogo.</p>
            
            {/* Listas Permitidas */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">1. Listas de Precio Autorizadas</h4>
              <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                {['A', 'B', 'C', 'D', 'E'].map(lst => {
                   const isAllowed = listsState.includes(lst);
                   return (
                     <div key={lst} className={`relative flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer ${isAllowed ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'}`} onClick={() => toggleList(lst)}>
                        <input 
                           type="checkbox" 
                           readOnly 
                           checked={isAllowed} 
                           className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 mr-2"
                        />
                        <span className={`font-bold ${isAllowed ? 'text-blue-900' : 'text-slate-500'}`}>Lista {lst}</span>
                     </div>
                   );
                })}
              </div>
            </div>

            {/* Lista por Defecto */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">2. Lista de Precio por Defecto</h4>
              <p className="text-xs text-slate-500 mb-4">Esta lista se utilizará automáticamente en el editor 3D si el diseñador no elige una explícitamente.</p>
              <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                {listsState.map(lst => {
                   const isDefault = defaultListState === lst;
                   return (
                     <label key={'def-'+lst} className={`flex items-center p-2 rounded cursor-pointer transition-colors ${isDefault ? 'bg-emerald-200/50 font-bold text-emerald-900' : 'text-slate-600 hover:bg-emerald-100/50'}`}>
                        <input 
                           type="radio" 
                           name="defaultList"
                           checked={isDefault}
                           onChange={() => setDefaultListState(lst)}
                           className="w-4 h-4 text-emerald-600 bg-emerald-100 border-emerald-300 focus:ring-emerald-500 mr-2"
                        />
                        Lista {lst}
                     </label>
                   )
                })}
                {listsState.length === 0 && <span className="text-sm text-slate-400 italic">Debes autorizar al menos una lista primero.</span>}
              </div>
            </div>

            {/* Descuento Global */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">3. Descuento Comercial Global</h4>
              <p className="text-xs text-slate-500 mb-4">Porcentaje de descuento base que aplica a TODOS los productos del catálogo al calcular el &quot;Authorized Price&quot;.</p>
              <div className="flex items-center p-4 rounded-lg bg-orange-50 border border-orange-100">
                <div className="relative w-48">
                  <input
                    type="number" step="0.1" min="0" max="100" required
                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:border-orange-500 focus:ring-orange-500 pr-8 text-lg font-bold text-orange-900 bg-white shadow-sm"
                    value={discountState}
                    onChange={(e) => setDiscountState(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-2.5 text-orange-400 font-bold text-lg">%</span>
                </div>
                <div className="ml-4 flex flex-col justify-center">
                  <span className="text-sm font-bold text-orange-900">Aplicado directamente</span>
                  <span className="text-xs text-orange-700 mt-1">Este descuento reduce la base imponible antes de cualquier impuesto sobre tus productos.</span>
                </div>
              </div>
            </div>
            
            {/* Acciones */}
            <div className="border-t border-slate-200 pt-6 flex justify-end">
               <AdminButton loading={isSavingComercial} onClick={handleSaveComercialRules}>
                  Guardar Reglas Comerciales
               </AdminButton>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">Diseñadores y administradores autorizados bajo el paraguas de este distribuidor.</p>
            <AdminButton size="sm" onClick={() => setIsUserModalOpen(true)}>
              + Nuevo Empleado
            </AdminButton>
          </div>
          <AdminTable
            columns={userColumns as any}
            data={distributor.users || []}
            emptyMessage="No hay personal registrado. Puedes invitar a los diseñadores de tu distribuidor."
          />
        </>
      )}

      {/* Modal: Crear Usuario */}
      <AdminModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Nuevo Empleado de Distribuidor"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal *</label>
            <input
              type="password" required minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              placeholder="Mínimo 6 caracteres"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol Operativo</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
            >
              <option value="DESIGNER">Diseñador — Puede generar renders y cotizar bajo el distribuidor</option>
              <option value="SALES">Vendedor — Solo cotizaciones</option>
              <option value="DISTRIBUTOR_ADMIN">Gerente — Gestiona PRO Markups</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
