"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { api } from '@/lib/api';

export default function PlatformActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any[]>('/audit/platform');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    { header: 'Date', accessor: (l: any) => new Date(l.createdAt).toLocaleString() },
    { header: 'Action', accessor: (l: any) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-800">{l.action}</span> },
    { header: 'Entity Type', accessor: 'entityType' as const },
    { header: 'Actor Type', accessor: 'actorType' as const },
    { header: 'Actor ID', accessor: (l: any) => <span className="text-xs text-slate-500" title={l.actorId}>{l.actorId.slice(0, 8)}...</span> },
  ];

  return (
    <AdminLayout type="platform" title="Activity Logs">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">System Activity Logs</h2>
        <p className="text-sm text-slate-500">Global audit trail for all significant system events across tenants.</p>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={logs} 
        loading={isLoading}
        emptyMessage="No activity logs found."
      />
    </AdminLayout>
  );
}
