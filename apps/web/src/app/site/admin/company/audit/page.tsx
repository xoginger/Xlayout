"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { api } from '@/lib/api';

export default function CompanyAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/audit/company');
      setLogs(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { 
      header: 'Timestamp', 
      accessor: (log: any) => new Date(log.createdAt).toLocaleString() 
    },
    { 
      header: 'Actor', 
      accessor: (log: any) => (
        <span className="font-medium text-slate-800 tracking-tight">
          {log.actorEmail || log.actorId}
        </span>
      ) 
    },
    { 
      header: 'Action', 
      accessor: (log: any) => (
        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600 uppercase border border-slate-200">
          {log.action}
        </span>
      ) 
    },
    { 
      header: 'Resource', 
      accessor: (log: any) => (
        <span className="font-mono text-xs text-slate-500">
          {log.resourceType} : {log.resourceId || '-'}
        </span>
      ) 
    },
    { 
      header: 'Details', 
      accessor: (log: any) => (
        <span className="text-xs text-slate-400 block max-w-xs truncate" title={JSON.stringify(log.metadata)}>
          {log.metadata ? JSON.stringify(log.metadata) : '-'}
        </span>
      ) 
    },
  ];

  return (
    <AdminLayout type="company" title="Activity Logs">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tenant Audit</h2>
          <p className="text-sm text-slate-500">Security and operation logs restricted to your company's actions.</p>
        </div>
        <button onClick={fetchLogs} className="p-2 border border-slate-300 rounded hover:bg-slate-50">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={logs} 
        loading={isLoading}
        emptyMessage="No audit logs recorded for your tenant yet."
      />
    </AdminLayout>
  );
}
