/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { AlertCard } from '@/components/admin/AlertCard';
import { QuickAction } from '@/components/admin/QuickAction';
import { usePlatformStore } from '@/store/admin-platform-store';

// Íconos reutilizables para la vista general
const BrandsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m1 8h1m1-3h1"/></svg>;
const DistIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>;
const UsersIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
const ProductsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
const HealthIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>;
const SearchIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>;
const GearIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const AlertIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>;

export default function PlatformOverviewPage() {
  const { metrics, fetchMetrics } = usePlatformStore();
  const router = useRouter();

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Calcular alertas activas
  const alerts = [];
  if (metrics) {
    if (metrics.assets3d.failed > 0) {
      alerts.push({
        severity: 'error' as const,
        title: 'Assets con error',
        count: metrics.assets3d.failed,
        description: 'Assets 3D que fallaron en el pipeline de conversión',
        actionLabel: 'Revisar assets',
        onClick: () => router.push('/admin/platform/assets3d'),
      });
    }
    if (metrics.imports.failed > 0) {
      alerts.push({
        severity: 'error' as const,
        title: 'Importaciones fallidas',
        count: metrics.imports.failed,
        description: 'Jobs de importación que terminaron con error',
        actionLabel: 'Ver importaciones',
        onClick: () => router.push('/admin/platform/activity'),
      });
    }
    if (metrics.pendingDistributors > 0) {
      alerts.push({
        severity: 'warning' as const,
        title: 'Distribuidores pendientes',
        count: metrics.pendingDistributors,
        description: 'Distribuidores esperando revisión o aprobación',
        actionLabel: 'Revisar',
        onClick: () => router.push('/admin/platform/distributors'),
      });
    }
    if (metrics.suspendedUsers > 0) {
      alerts.push({
        severity: 'warning' as const,
        title: 'Usuarios suspendidos',
        count: metrics.suspendedUsers,
        description: 'Usuarios que están actualmente suspendidos',
        actionLabel: 'Ver usuarios',
        onClick: () => router.push('/admin/platform/users'),
      });
    }
    if (metrics.suspendedTenants > 0) {
      alerts.push({
        severity: 'warning' as const,
        title: 'Marcas suspendidas',
        count: metrics.suspendedTenants,
        description: 'Marcas/fabricantes actualmente suspendidos',
        actionLabel: 'Ver marcas',
        onClick: () => router.push('/admin/platform/tenants'),
      });
    }
    if (metrics.assets3d.pending > 0) {
      alerts.push({
        severity: 'info' as const,
        title: 'Assets en proceso',
        count: metrics.assets3d.pending,
        description: 'Assets 3D pendientes de conversión',
        actionLabel: 'Ver pipeline',
        onClick: () => router.push('/admin/platform/assets3d'),
      });
    }
  }

  return (
    <AdminLayout type="platform" title="Vista General">
      {/* Métricas KPI principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Marcas Activas"
          value={metrics?.activeTenants || 0}
          color="blue"
          icon={<BrandsIcon />}
          onClick={() => router.push('/admin/platform/tenants')}
        />
        <StatCard
          label="Distribuidores"
          value={metrics?.activeDistributors || 0}
          color="emerald"
          icon={<DistIcon />}
          onClick={() => router.push('/admin/platform/distributors')}
        />
        <StatCard
          label="Usuarios Totales"
          value={metrics?.totalUsers || 0}
          color="indigo"
          icon={<UsersIcon />}
          onClick={() => router.push('/admin/platform/users')}
        />
        <StatCard
          label="Productos"
          value={metrics?.totalProducts || 0}
          color="amber"
          icon={<ProductsIcon />}
        />
        <StatCard
          label="Salud del Sistema"
          value="Operativo"
          color="emerald"
          icon={<HealthIcon />}
          onClick={() => router.push('/admin/platform/config')}
        />
      </div>

      {/* Alertas activas */}
      {alerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-rose-500"><AlertIcon /></div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Alertas Activas</h2>
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">{alerts.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, i) => (
              <AlertCard key={i} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Si no hay alertas, mostrar estado positivo */}
      {alerts.length === 0 && metrics && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <div className="text-emerald-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Sin alertas activas</p>
            <p className="text-xs text-emerald-600">Todos los sistemas operando con normalidad.</p>
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction
            label="Crear Marca"
            description="Dar de alta un nuevo fabricante"
            icon={<PlusIcon />}
            variant="primary"
            onClick={() => router.push('/admin/platform/tenants')}
          />
          <QuickAction
            label="Revisar Distribuidores"
            description="Ver solicitudes pendientes"
            icon={<SearchIcon />}
            variant="warning"
            onClick={() => router.push('/admin/platform/distributors')}
          />
          <QuickAction
            label="Ver Actividad Crítica"
            description="Auditoría y eventos recientes"
            icon={<AlertIcon />}
            variant="default"
            onClick={() => router.push('/admin/platform/activity')}
          />
          <QuickAction
            label="Configuración"
            description="Parámetros y salud del sistema"
            icon={<GearIcon />}
            variant="default"
            onClick={() => router.push('/admin/platform/config')}
          />
        </div>
      </div>

      {/* Resumen por entidad */}
      {metrics && (
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">Resumen de Plataforma</h2>
          <div className="admin-card overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.totalPlatformUsers}</p>
                <p className="text-xs text-slate-500 mt-1">Admins de Plataforma</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.totalCompanyUsers}</p>
                <p className="text-xs text-slate-500 mt-1">Usuarios de Marcas</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.totalDistributorUsers}</p>
                <p className="text-xs text-slate-500 mt-1">Usuarios de Distribuidores</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.totalEndUsers}</p>
                <p className="text-xs text-slate-500 mt-1">Usuarios Finales</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.assets3d.total}</p>
                <p className="text-xs text-slate-500 mt-1">Assets 3D Totales</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-emerald-600">{metrics.assets3d.converted}</p>
                <p className="text-xs text-slate-500 mt-1">Assets Procesados</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.totalAccesses}</p>
                <p className="text-xs text-slate-500 mt-1">Relaciones de Acceso</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{metrics.activationCodes.active}</p>
                <p className="text-xs text-slate-500 mt-1">Códigos Activos</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
