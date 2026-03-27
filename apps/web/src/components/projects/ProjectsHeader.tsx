/**
 * Creado y diseñado por XO
 */
import React from 'react';
import { ProjectListing } from '@/services/project-service';

interface Props {
  projects: ProjectListing[];
  onCreateNew: () => void;
}

export const ProjectsHeader: React.FC<Props> = ({ projects, onCreateNew }) => {
  const totalValue = projects.reduce((acc, p) => acc + (Number(p.estimatedValue) || 0), 0);
  const activeProjects = projects.filter(p => p.commercialStatus !== 'Ganado' && p.commercialStatus !== 'Perdido' && p.commercialStatus !== 'Pausado').length;
  const wonProjects = projects.filter(p => p.commercialStatus === 'Ganado').length;
  const quotingProjects = projects.filter(p => p.commercialStatus === 'Cotización').length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Proyectos CRM</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gestiona el ciclo completo de tus proyectos</p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-[0.1em] transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
            <path d="M5 12h14M12 5v14"/>
          </svg>
          Nuevo Proyecto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Activos</div>
          <div className="text-3xl font-black text-slate-800">{activeProjects}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">En Cotización</div>
          <div className="text-3xl font-black text-blue-600">{quotingProjects}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Proyectos Ganados</div>
          <div className="text-3xl font-black text-green-600">{wonProjects}</div>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Pipeline Estimado</div>
          <div className="text-3xl font-black text-white">${totalValue.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};
