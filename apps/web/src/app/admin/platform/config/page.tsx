"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';

export default function PlatformConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configData, healthData] = await Promise.all([
        api.get('/platform/info/config'),
        api.get('/platform/info/health')
      ]);
      setConfig(configData);
      setHealth(healthData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout type="platform" title="Platform Configuration">
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
    <AdminLayout type="platform" title="Platform Configuration">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Global Settings & Health</h2>
        <p className="text-sm text-slate-500">System configuration, enabled modules, and service health status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Health Card */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-slate-200">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-slate-900">System Health</h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${health?.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {health?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-slate-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">Last Checked</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">Database</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0 font-medium text-green-600">
                  {health?.services?.database || 'UNKNOWN'}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">Redis Cache</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0 font-medium text-green-600">
                  {health?.services?.redis || 'UNKNOWN'}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">API Gateway</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0 font-medium text-green-600">
                  {health?.services?.api || 'UNKNOWN'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Global Configuration Card */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-slate-200">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg leading-6 font-medium text-slate-900">Global Configuration</h3>
          </div>
          <div className="px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-slate-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">Platform Name</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">{config?.platformName}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">Environment</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0 font-mono capitalize">{config?.environment}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">Active Version</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0 font-mono text-xs bg-slate-100 p-1 rounded inline-block">{config?.version}</dd>
              </div>
              
              {/* Feature Flags */}
              <div className="py-4 sm:py-5 px-6">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Enabled Modules</h4>
                <div className="space-y-3">
                  {config?.features && Object.entries(config.features).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${enabled ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
