/**
 * Creado y diseñado por XO
 */
import React from 'react';
import { ProjectListing } from '@/services/project-service';

interface Props {
  project: ProjectListing;
  onClick: (project: ProjectListing) => void;
  onDragStart?: (e: React.DragEvent, projectId: string) => void;
}

export const ProjectCard: React.FC<Props> = ({ project, onClick, onDragStart }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, project.id)}
      onClick={() => onClick(project)}
      className="bg-white border border-slate-200 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-800 text-sm">{project.name}</h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          project.priority === 'Alta' ? 'bg-red-100 text-red-600' : 
          project.priority === 'Media' ? 'bg-yellow-100 text-yellow-600' : 
          'bg-slate-100 text-slate-600'
        }`}>
          {project.priority || 'Media'}
        </span>
      </div>
      
      {project.clientName && (
        <p className="text-xs text-slate-500 mb-2 truncate">
          <span className="font-medium">Cliente:</span> {project.clientName} {project.clientCompany ? `(${project.clientCompany})` : ''}
        </p>
      )}

      <div className="flex justify-between items-end mt-4">
        <div className="text-[11px] text-slate-400">
          Última act: {new Date(project.updatedAt).toLocaleDateString()}
        </div>
        
        {project.estimatedValue ? (
          <div className="text-sm font-black text-slate-700">
            ${Number(project.estimatedValue).toLocaleString()}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-medium">Sin valor est.</div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {project._count?.versions || 0} Layouts
        </div>
      </div>
    </div>
  );
};
