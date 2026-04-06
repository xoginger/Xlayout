"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/admin/AdminTable';

export default function CompanyDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.get('/company/info/metrics');
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <AdminLayout type="company" title="Dashboard">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Company Overview</h2>
        <p className="text-sm text-slate-500">Summary of your catalog, pricing, and active accesses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Products" 
          value={String(metrics?.productsCount || 0)} 
          trend={{ value: '0', type: 'up' }} 
        />
        <StatCard 
          label="Active Lines" 
          value={String(metrics?.linesCount || 0)} 
        />
        <StatCard 
          label="Active Codes" 
          value={String(metrics?.codesCount || 0)} 
        />
        <StatCard 
          label="Catalog Accesses" 
          value={String(metrics?.accessCount || 0)} 
          trend={{ value: '0', type: 'up' }} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Imports Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Recent File Imports</h3>
            <a href="/admin/company/imports" className="text-sm text-blue-600 hover:text-blue-800">View All</a>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="p-5 text-center text-sm text-slate-500 animate-pulse">Loading imports...</div>
            ) : metrics?.recentImports && metrics.recentImports.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {metrics.recentImports.map((job: any) => (
                  <li key={job.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{job.filename}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(job.createdAt).toLocaleString()} · {job.type}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">No recent imports found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Getting Started */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-base font-semibold text-slate-800">Quick Actions</h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              <a href="/admin/company/catalog/products" className="block p-4 border border-slate-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <h4 className="font-medium text-slate-800 text-sm">Manage Products</h4>
                <p className="text-xs text-slate-500 mt-1">Add or edit items in your 3D product catalog.</p>
              </a>
              <a href="/admin/company/pricing" className="block p-4 border border-slate-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <h4 className="font-medium text-slate-800 text-sm">Update Pricing</h4>
                <p className="text-xs text-slate-500 mt-1">Set product base prices and commercial conditions.</p>
              </a>
              <a href="/admin/company/access/codes" className="block p-4 border border-slate-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <h4 className="font-medium text-slate-800 text-sm">Generate Access Codes</h4>
                <p className="text-xs text-slate-500 mt-1">Create codes to invite architects and distributors.</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
