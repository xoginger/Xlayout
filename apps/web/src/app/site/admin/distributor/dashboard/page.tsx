/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { useAuthStore } from '@/store/auth-store';

// Tablero principal del panel de distribuidor
export default function DistributorDashboardPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Los datos ya vienen del token — no se necesita fetch adicional
    setIsLoading(false);
  }, []);

  // Contadores derivados del contexto del usuario autenticado
  const catalogCount = user?.tenants?.length || 0;
  const markupCount = user?.priceMarkups?.length || 0;

  return (
    <AdminLayout type="distributor" title="Panel de Distribuidor">
      {/* Bienvenida */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800">
          ¡Bienvenido, {user?.distributorName || 'Distribuidor'}!
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Resumen del estado de tus catálogos y configuración comercial.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Catálogos Autorizados"
          value={String(catalogCount)}
        />
        <StatCard
          label="Reglas de Markup"
          value={String(markupCount)}
        />
        <StatCard
          label="Mi Rol"
          value={user?.distributorRole === 'DISTRIBUTOR_ADMIN' ? 'Admin' :
                 user?.distributorRole === 'DESIGNER' ? 'Diseñador' : 'Vendedor'}
        />
        <StatCard
          label="Estado"
          value="Activo"
          trend={{ value: '✓', type: 'up' }}
        />
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catálogos disponibles */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Catálogos Disponibles</h3>
            <a href="/admin/distributor/catalogs" className="text-sm text-blue-600 hover:text-blue-800">Ver Todos</a>
          </div>
          <div className="p-0">
            {user?.tenants && user.tenants.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {user.tenants.slice(0, 5).map((tenant) => (
                  <li key={tenant.tenantId} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{tenant.tenantName}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Lista de precios: <span className="font-semibold text-blue-600">{tenant.priceListType || 'A'}</span>
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Autorizado
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">No tienes catálogos autorizados aún.</p>
                <p className="text-xs text-slate-400 mt-1">Contacta a un fabricante para solicitar acceso.</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-base font-semibold text-slate-800">Acciones Rápidas</h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              <a href="/editor" className="block p-4 border border-slate-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <h4 className="font-medium text-slate-800 text-sm">Abrir Editor 3D</h4>
                <p className="text-xs text-slate-500 mt-1">Crea propuestas de diseño con los productos del catálogo.</p>
              </a>
              <a href="/admin/distributor/catalogs" className="block p-4 border border-slate-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <h4 className="font-medium text-slate-800 text-sm">Explorar Catálogos</h4>
                <p className="text-xs text-slate-500 mt-1">Consulta productos, precios y disponibilidad por fabricante.</p>
              </a>
              {user?.distributorRole === 'DISTRIBUTOR_ADMIN' && (
                <a href="/admin/distributor/markup" className="block p-4 border border-slate-200 rounded-md hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                  <h4 className="font-medium text-slate-800 text-sm">Configurar Markup</h4>
                  <p className="text-xs text-slate-500 mt-1">Ajusta los incrementos comerciales sobre los precios base.</p>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
