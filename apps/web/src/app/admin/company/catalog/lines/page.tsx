/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useAdminCatalogStore, ProductLine } from '@/store/admin-catalog-store';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';

// Iconos inline
const PlusIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
const PackageIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;

export default function ProductLinesPage() {
  const { lines, isLoading, fetchLines, createLine, updateLine, updateLineStatus, deleteLine } = useAdminCatalogStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', description: '', active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setFormData({ id: '', name: '', description: '', active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (line: ProductLine) => {
    setIsEdit(true);
    setFormData({ 
      id: line.id, 
      name: line.name, 
      description: line.description || '', 
      active: line.active 
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updateLine(formData.id, { name: formData.name, description: formData.description, active: formData.active });
      } else {
        await createLine(formData.name, formData.description);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Error al guardar la línea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, productCount: number) => {
    if (productCount > 0) {
      alert('No se puede eliminar una línea con productos asociados. Reasigna los productos primero.');
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar esta línea?')) return;
    setDeletingId(id);
    try {
      await deleteLine(id);
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la línea');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (line: ProductLine) => {
    try {
      await updateLineStatus(line.id, !line.active);
    } catch (err) {
      alert('Error al actualizar el estado');
    }
  };

  const columns = [
    {
      header: 'Nombre de Línea',
      accessor: (l: ProductLine) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-sm">{l.name}</span>
          <span className="text-[10px] font-mono text-slate-400">{l.slug}</span>
        </div>
      )
    },
    {
      header: 'Descripción',
      accessor: (l: ProductLine) => (
        <span className="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title={l.description || ''}>
          {l.description || '—'}
        </span>
      )
    },
    {
      header: 'Productos',
      accessor: (l: ProductLine) => (
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <PackageIcon />
          {l._count?.products || 0}
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (l: ProductLine) => (
        <button 
          onClick={() => handleToggleStatus(l)}
          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
            l.active 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}
        >
          {l.active ? 'Activa' : 'Inactiva'}
        </button>
      )
    },
    {
      header: 'Acciones',
      accessor: (l: ProductLine) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleOpenEdit(l)}
            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <EditIcon />
          </button>
          <button 
            onClick={() => handleDelete(l.id, l._count?.products || 0)}
            disabled={deletingId === l.id}
            className={`p-1.5 transition-colors ${
              (l._count?.products || 0) > 0 
                ? 'text-slate-200 cursor-not-allowed' 
                : 'text-slate-400 hover:text-rose-600'
            }`}
            title="Eliminar"
          >
            <TrashIcon />
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout type="company" title="Líneas de Producto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 text-premium">Catálogo de Líneas</h2>
          <p className="text-sm text-slate-500">Administra las líneas para organizar tus productos.</p>
        </div>
        <AdminButton onClick={handleOpenCreate} icon={<PlusIcon />}>
          Nueva Línea
        </AdminButton>
      </div>

      {lines.length === 0 && !isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No hay líneas creadas</h3>
          <p className="text-sm text-slate-500 mb-6">Esta marca aún no tiene líneas de producto. Crea la primera para comenzar.</p>
          <AdminButton onClick={handleOpenCreate} icon={<PlusIcon />}>
            Crear Primera Línea
          </AdminButton>
        </div>
      ) : (
        <AdminTable columns={columns as any} data={lines} loading={isLoading} />
      )}

      {/* Modal de Creación / Edición */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEdit ? "Editar Línea de Producto" : "Nueva Línea de Producto"}
        width="max-w-md"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleSave} loading={isSubmitting}>
              {isEdit ? 'Guardar Cambios' : 'Crear Línea'}
            </AdminButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre de la Línea</label>
            <input 
              type="text" 
              className="premium-input w-full" 
              placeholder="Ej: Racks, Lockers, Terra..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción (Opcional)</label>
            <textarea 
              className="premium-input w-full min-h-[80px] py-2" 
              placeholder="Breve descripción de la línea..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <input 
              type="checkbox" 
              id="line-active"
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="line-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Línea Activa (Disponible en el catálogo)
            </label>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
