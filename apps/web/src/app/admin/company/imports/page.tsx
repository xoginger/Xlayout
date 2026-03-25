/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

/**
 * Página de Importaciones — solo datos de negocio (CSV/Excel).
 * NO gestiona modelos 3D — eso es responsabilidad del módulo Assets 3D.
 */
export default function CompanyImportsPage() {
  const { activeTenantId } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'catalog', fileUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTenantId) fetchJobs();
  }, [activeTenantId]);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/imports');
      setJobs(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileUrl) return;
    setIsSubmitting(true);
    try {
      await api.post('/imports', formData);
      setIsModalOpen(false);
      setFormData({ type: 'catalog', fileUrl: '' });
      fetchJobs();
    } catch (err) {
      alert('Error al encolar la importación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { 
      header: 'ID', 
      accessor: (job: any) => (
        <span className="font-mono text-xs text-slate-500 bg-slate-100 p-1 rounded tracking-tight">
          {job.id.substring(0, 8)}...
        </span>
      ) 
    },
    { 
      header: 'Tipo', 
      accessor: (job: any) => (
        <span className="font-semibold text-xs tracking-wider text-slate-700 uppercase">
          {job.type}
        </span>
      ) 
    },
    { 
      header: 'Archivo', 
      accessor: (job: any) => (
        <a href={job.filename || '#'} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs truncate max-w-[200px] block">
          {job.filename}
        </a>
      ) 
    },
    { 
      header: 'Fecha', 
      accessor: (job: any) => new Date(job.createdAt).toLocaleString('es-MX') 
    },
    { 
      header: 'Estado', 
      accessor: (job: any) => {
        let statusTag = 'PENDING';
        if (job.status === 'COMPLETED' || job.status === 'completed') statusTag = 'ACTIVE';
        if (job.status === 'FAILED' || job.status === 'failed') statusTag = 'SUSPENDED';
        if (job.status === 'IN_PROGRESS' || job.status === 'active') statusTag = 'WARN';
        
        return <StatusBadge status={statusTag as any} />;
      }
    },
    {
      header: 'Resultado',
      accessor: (job: any) => (
        <span className="text-xs text-slate-500">
          {job.summary ? `${job.summary.succeeded} insertados, ${job.summary.failed} fallidos` : 'En cola para procesamiento'}
        </span>
      )
    }
  ];

  return (
    <AdminLayout type="company" title="Importaciones">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Carga Masiva CSV/Excel</h2>
          <p className="text-sm text-slate-500">Importa productos, precios y condiciones desde archivos CSV o Excel.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchJobs} className="p-2 border border-slate-300 rounded hover:bg-slate-50">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <AdminButton onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>}>
            Nueva Importación
          </AdminButton>
        </div>
      </div>

      <AdminTable 
        columns={columns as any} 
        data={jobs} 
        loading={isLoading}
        emptyMessage="No se han ejecutado importaciones para este tenant."
      />

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Programar Importación CSV"
        footer={(
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleTrigger} loading={isSubmitting}>Iniciar Importación</AdminButton>
          </>
        )}
      >
        <form onSubmit={handleTrigger} className="space-y-4">
          <p className="text-sm text-slate-500 mb-4">Las importaciones se procesan en segundo plano mediante colas BullMQ.</p>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Importación</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="catalog">Productos y Categorías</option>
              <option value="prices">Listas de Precios (actualizar precios base)</option>
              <option value="conditions">Condiciones Comerciales</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL del Archivo CSV</label>
            <input 
              type="url" required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500" 
              placeholder="https://storage.xlayout.io/uploads/catalogo_q1.csv"
              value={formData.fileUrl}
              onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
            />
          </div>

          <button type="submit" className="hidden" />
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
