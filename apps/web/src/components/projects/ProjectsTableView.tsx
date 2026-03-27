/**
 * Creado y diseñado por XO
 */
import React from 'react';
import { ProjectListing } from '@/services/project-service';

interface Props {
  projects: ProjectListing[];
  onProjectClick: (project: ProjectListing) => void;
}

export const ProjectsTableView: React.FC<Props> = ({ projects, onProjectClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-500 tracking-wider">
            <tr>
              <th className="px-6 py-4">Proyecto</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Est. Comercial</th>
              <th className="px-6 py-4">Est. Operativo</th>
              <th className="px-6 py-4">Valor Est.</th>
              <th className="px-6 py-4">Última Edición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p) => (
              <tr 
                key={p.id} 
                onClick={() => onProjectClick(p)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-bold text-slate-800">
                  {p.name}
                  {p.projectCode && <span className="block text-[10px] text-slate-400 font-normal">{p.projectCode}</span>}
                </td>
                <td className="px-6 py-4">
                  {p.clientName || '-'}
                  {p.clientCompany && <span className="block text-[10px] text-slate-400">{p.clientCompany}</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                    {p.commercialStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                    {p.operationalStatus}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-slate-700">
                  {p.estimatedValue ? `$${Number(p.estimatedValue).toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                  No hay proyectos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
