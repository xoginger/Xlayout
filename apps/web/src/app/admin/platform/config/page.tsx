/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/AdminTable';
import { usePlatformStore } from '@/store/admin-platform-store';

export default function PlatformConfigPage() {
  const { config, health, metrics, fetchConfig, fetchHealth, fetchMetrics } = usePlatformStore();

  useEffect(() => {
    fetchConfig();
    fetchHealth();
    fetchMetrics();
  }, [fetchConfig, fetchHealth, fetchMetrics]);

  const isLoading = !config && !health;

  if (isLoading) {
    return (
      <AdminLayout type="platform" title="Configuración">
        <div className="animate-pulse flex space-x-4 p-6">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout type="platform" title="Configuración">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Configuración de Plataforma</h2>
        <p className="text-sm text-slate-500">Estado del sistema, módulos habilitados, servicios y parámetros globales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Salud del sistema */}
        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Salud del Sistema</h3>
            <StatusBadge status={health?.status === 'OK' ? 'ACTIVE' : 'FAILED'} />
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Base de Datos</span>
              <span className={`text-sm font-medium ${health?.services?.database === 'Operational' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {health?.services?.database || 'Desconocido'}
              </span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Redis Cache</span>
              <span className={`text-sm font-medium ${health?.services?.redis === 'Operational' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {health?.services?.redis || 'Desconocido'}
              </span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">API Gateway</span>
              <span className={`text-sm font-medium ${health?.services?.api === 'Operational' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {health?.services?.api || 'Desconocido'}
              </span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Última Verificación</span>
              <span className="text-xs text-slate-500">
                {health?.timestamp ? new Date(health.timestamp).toLocaleString('es-MX') : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Configuración global */}
        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800">Configuración Global</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Nombre de Plataforma</span>
              <span className="text-sm font-medium text-slate-800">{config?.platformName}</span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Versión Activa</span>
              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{config?.version}</span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Entorno</span>
              <span className="text-sm font-medium text-slate-800 capitalize">{config?.environment}</span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Fecha de Build</span>
              <span className="text-sm text-slate-500">{config?.buildDate || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos habilitados */}
      <div className="admin-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Módulos Habilitados</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config?.features && Object.entries(config.features).map(([key, enabled]) => (
              <div key={key} className={`flex items-center justify-between rounded-lg border p-4 ${
                enabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contadores globales de la plataforma */}
      {metrics && (
        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800">Contadores Globales</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Marcas', value: metrics.totalTenants },
                { label: 'Distribuidores', value: metrics.totalDistributors },
                { label: 'Usuarios Totales', value: metrics.totalUsers },
                { label: 'Productos', value: metrics.totalProducts },
                { label: 'Assets 3D', value: metrics.assets3d.total },
                { label: 'Accesos', value: metrics.totalAccesses },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
