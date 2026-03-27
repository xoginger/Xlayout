/**
 * Creado y diseñado por XO
 */
import React, { useState } from 'react';
import { ProjectListing } from '@/services/project-service';

interface Props {
  project: ProjectListing | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<ProjectListing>) => Promise<void>;
  onOpenEditor: (projectId: string) => void;
}

export const ProjectDetailDrawer: React.FC<Props> = ({ project, onClose, onUpdate, onOpenEditor }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'comercial' | 'operativo' | 'layouts' | 'cotizaciones'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectListing>>(project || {});

  // Update effect to reset state when project changes
  React.useEffect(() => {
    if (project) setFormData(project);
  }, [project]);

  if (!project) return null;

  const handleChange = (field: keyof ProjectListing, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(project.id, formData);
    setIsSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'comercial', label: 'Comercial' },
    { id: 'operativo', label: 'Operativo' },
    { id: 'layouts', label: 'Layouts' },
    { id: 'cotizaciones', label: 'Cotizaciones' }
  ] as const;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 translate-x-0 transition-transform">
        
        {/* Header Drawer */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Ficha del Proyecto
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{project.name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-200 bg-white pt-2 gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[11px] font-black uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido Tabs */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre del Proyecto</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 text-slate-800" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Descripción o Notas</label>
                <textarea 
                  value={formData.description || ''} 
                  onChange={e => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 resize-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Código (Opcional)</label>
                  <input type="text" value={formData.projectCode || ''} onChange={e => handleChange('projectCode', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Prioridad</label>
                  <select value={formData.priority || 'Media'} onChange={e => handleChange('priority', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre Cliente</label>
                  <input type="text" value={formData.clientName || ''} onChange={e => handleChange('clientName', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Empresa Cliente</label>
                  <input type="text" value={formData.clientCompany || ''} onChange={e => handleChange('clientCompany', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Contacto</label>
                  <input type="email" value={formData.contactEmail || ''} onChange={e => handleChange('contactEmail', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono Contacto</label>
                  <input type="text" value={formData.contactPhone || ''} onChange={e => handleChange('contactPhone', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comercial' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Etapa Comercial (Pipeline)</label>
                <select value={formData.commercialStatus || 'Prospecto'} onChange={e => handleChange('commercialStatus', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white">
                  <option value="Prospecto">Prospecto</option>
                  <option value="Descubrimiento">Descubrimiento</option>
                  <option value="Diseño">Diseño</option>
                  <option value="Cotización">Cotización</option>
                  <option value="Presentado">Presentado</option>
                  <option value="Negociación">Negociación</option>
                  <option value="Ganado">Ganado</option>
                  <option value="Perdido">Perdido</option>
                  <option value="Pausado">Pausado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Valor Estimado (Pipeline)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                    <input type="number" value={formData.estimatedValue || ''} onChange={e => handleChange('estimatedValue', Number(e.target.value))} className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Valor Final Cerrado</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                    <input type="number" value={formData.finalValue || ''} onChange={e => handleChange('finalValue', Number(e.target.value))} className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Probabilidad (%)</label>
                  <input type="number" min="0" max="100" value={formData.probability || ''} onChange={e => handleChange('probability', Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Fecha Cierre Esperada</label>
                  <input type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => handleChange('dueDate', new Date(e.target.value).toISOString())} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'operativo' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Fase Operativa / Diseño</label>
                <select value={formData.operationalStatus || 'Sin iniciar'} onChange={e => handleChange('operationalStatus', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white">
                  <option value="Sin iniciar">Sin iniciar</option>
                  <option value="En diseño">En diseño</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Cotización generada">Cotización generada</option>
                  <option value="Propuesta enviada">Propuesta enviada</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="En ajuste">En ajuste</option>
                  <option value="Cerrado">Cerrado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'layouts' && (
            <div className="space-y-4">
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-6">
                <h4 className="font-bold text-blue-900 text-sm mb-1">XLayout Editor</h4>
                <p className="text-xs text-blue-700 mb-4">Abre este proyecto en el editor 3D para trabajar en los planos y distribución.</p>
                <button 
                  onClick={() => onOpenEditor(project.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-4 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Abrir Proyecto en Editor
                </button>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Versiones Guardadas</div>
                {/* En un caso real haríamos un fetch de versions. Por ahora mostramos el count */}
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  Versiones guardadas: <span className="font-bold">{project._count?.versions || 0}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cotizaciones' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Las cotizaciones se generan automáticamente al guardar desde el Editor y se asocian a las distintas versiones del proyecto.
              </p>
              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                Para ver el historial completo de cotizaciones de este proyecto, se requiere implementar la conexión al endpoint <code>/projects/:id/quotes</code>. 
              </div>
              {/* Aquí se podría mapear una lista de quotes reali si se hiciera un fetch */}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 shadow-md shadow-slate-300 disabled:opacity-50 transition-all">
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </>
  );
};
