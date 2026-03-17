"use client";

import React, { useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { usePlatformStore } from '@/store/admin-platform-store';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';

export default function PlatformOverviewPage() {
  const { metrics, tenants, fetchMetrics, fetchTenants, isLoading } = usePlatformStore();

  useEffect(() => {
    fetchMetrics();
    fetchTenants();
  }, [fetchMetrics, fetchTenants]);

  const tenantColumns = [
    { header: 'Tenant Name', accessor: 'name' as const },
    { header: 'Slug', accessor: 'slug' as const },
    { header: 'Status', accessor: (t: any) => <StatusBadge status={t.status} /> },
    { header: 'Created At', accessor: (t: any) => new Date(t.createdAt).toLocaleDateString() },
  ];

  return (
    <AdminLayout type="platform" title="Platform Overview">
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Tenants" 
          value={metrics?.totalTenants || 0} 
          trend={{ type: 'up', value: '12%' }}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m1 8h1m1-3h1m-5 1h1m-1 4h1m1 0h1m-1-5h1m-1 1h1m-1 4h1m1 0h1"/></svg>}
        />
        <StatCard 
          label="Active Users" 
          value={metrics?.totalUsers || 0} 
          trend={{ type: 'up', value: '5%' }}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
        />
        <StatCard 
          label="Total Products" 
          value={metrics?.totalProducts || 0} 
          trend={{ type: 'up', value: '24%' }}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>}
        />
        <StatCard 
          label="System Health" 
          value="99.9%" 
          trend={{ type: 'up', value: '0.1%' }}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* Recent Tenants Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 px-1">Recent Tenants</h2>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All Tenants</button>
        </div>
        <AdminTable 
          columns={tenantColumns as any} 
          data={tenants.slice(0, 5)} 
          loading={isLoading}
          emptyMessage="No tenants found yet."
        />
      </div>
    </AdminLayout>
  );
}
