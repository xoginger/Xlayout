/**
 * Creado y diseñado por XO
 */
import React from 'react';
import { ProjectListing } from '@/services/project-service';
import { ProjectsKanbanColumn } from './ProjectsKanbanColumn';

const COMMERCIAL_PIPELINE = [
  'Prospecto',
  'Descubrimiento',
  'Diseño',
  'Cotización',
  'Presentado',
  'Negociación',
  'Ganado',
  'Perdido',
  'Pausado'
];

interface Props {
  projects: ProjectListing[];
  onProjectClick: (project: ProjectListing) => void;
  onMoveProject: (projectId: string, newStatus: string) => void;
}

export const ProjectsKanbanBoard: React.FC<Props> = ({ projects, onProjectClick, onMoveProject }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 h-full items-start">
      {COMMERCIAL_PIPELINE.map((status) => {
        const columnProjects = projects.filter(p => p.commercialStatus === status);
        return (
          <ProjectsKanbanColumn
            key={status}
            title={status}
            status={status}
            projects={columnProjects}
            onProjectClick={onProjectClick}
            onDropProject={onMoveProject}
          />
        );
      })}
    </div>
  );
};
