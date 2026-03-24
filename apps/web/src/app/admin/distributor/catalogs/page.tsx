/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuthStore } from '@/store/auth-store';

// Vista de catálogos de fabricantes a los que el distribuidor tiene acceso
export default function DistributorCatalogsPage() {
  const { user } = useAuthStore();
  const catalogs = user?.tenants || [];

  return (
    <AdminLayout type="distributor" title="Catálogos Autorizados">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Catálogos de Fabricantes</h2>
        <p className="text-sm text-slate-500">
          Estos son los catálogos de productos que tu empresa distribuidora tiene autorizado comercializar.
        </p>
      </div>

      {catalogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <p className="text-slate-500">No tienes catálogos autorizados.</p>
          <p className="text-xs text-slate-400 mt-1">Contacta a un fabricante para solicitar acceso a su catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogs.map((catalog) => (
            <div key={catalog.tenantId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Encabezado del catálogo */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{catalog.tenantName}</h3>
                    <span className="text-xs text-slate-400">Fabricante</span>
                  </div>
                </div>
              </div>

              {/* Información del acceso */}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Lista de Precios</span>
                  <span className="px-3 py-1 text-sm font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Lista {catalog.priceListType || 'A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Precios</span>
                  <span className={`text-sm font-medium ${catalog.access.pricesEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {catalog.access.pricesEnabled ? '✓ Habilitados' : '✗ Deshabilitados'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Condiciones</span>
                  <span className={`text-sm font-medium ${catalog.access.conditionsEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {catalog.access.conditionsEnabled ? '✓ Habilitadas' : '✗ Deshabilitadas'}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <a
                  href="/editor"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Abrir en Editor →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
