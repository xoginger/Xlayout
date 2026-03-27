/**
 * Creado y diseñado por XO
 */
import React from 'react';
import { ProjectListing } from '@/services/project-service';
import { ProjectCard } from './ProjectCard';

interface Props {
  title: string;
  status: string;
  projects: ProjectListing[];
  onProjectClick: (project: ProjectListing) => void;
  onDropProject: (projectId: string, newStatus: string) => void;
}

export const ProjectsKanbanColumn: React.FC<Props> = ({ title, status, projects, onProjectClick, onDropProject }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necesario para permitir el drop
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      onDropProject(projectId, status);
    }
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
  };

  const totalValue = projects.reduce((acc, p) => acc + (Number(p.estimatedValue) || 0), 0);

  return (
    <div 
      className="flex-shrink-0 w-80 bg-slate-50/50 flex flex-col rounded-2xl border border-slate-200"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-slate-200">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
          <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
            {projects.length}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          ${totalValue.toLocaleString()}
        </div>
      </div>
      
      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
        {projects.map((p) => (
          <ProjectCard 
            key={p.id} 
            project={p} 
            onClick={onProjectClick} 
            onDragStart={handleDragStart}
          />
        ))}
        {projects.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
            <span className="text-xs text-slate-400 font-medium tracking-wide">Arrastra aquí</span>
          </div>
        )}
      </div>
    </div>
  );
};
