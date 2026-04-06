/**
 * Creado y diseñado por XO
 */
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useProjectsStore } from '@/store/projects-store';
import { ProjectListing } from '@/services/project-service';

import { ProjectsHeader } from '@/components/projects/ProjectsHeader';
import { ProjectsKanbanBoard } from '@/components/projects/ProjectsKanbanBoard';
import { ProjectsTableView } from '@/components/projects/ProjectsTableView';
import { ProjectsFilters } from '@/components/projects/ProjectsFilters';
import { ProjectDetailDrawer } from '@/components/projects/ProjectDetailDrawer';

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { projects, isLoading, fetchProjects, updateCommercialStatus, updateOperationalStatus, updateProject, createProject } = useProjectsStore();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedProject, setSelectedProject] = useState<ProjectListing | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProjects();
  }, [isAuthenticated, router, fetchProjects]);

  if (!isAuthenticated || !user) return null;

  // Filter projects by search term
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.projectCode && p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenEditor = (projectId: string) => {
    router.push(`/editor?projectId=${projectId}`);
  };

  const handleCreateNew = async () => {
    const newProjectData = {
      name: 'Nuevo Proyecto',
      commercialStatus: 'Prospecto',
      operationalStatus: 'Sin iniciar',
      priority: 'Media',
      estimatedValue: 0,
      probability: 10
    };
    const created = await createProject(newProjectData);
    if (created) setSelectedProject(created);
  };

  const handleUpdateDetail = async (id: string, data: Partial<ProjectListing>) => {
    await updateProject(id, data);
    // Detail view stays open and updates reactively since it receives the updated project from the store below
  };

  // Encontrar la referencia fresca del proyecto seleccionado si se actualizó en el store
  const activeDetailProject = selectedProject 
    ? projects.find(p => p.id === selectedProject.id) || null
    : null;

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-8 w-full h-full relative">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        
        <ProjectsHeader 
          projects={projects} 
          onCreateNew={handleCreateNew} 
        />
        
        <ProjectsFilters 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
        />

        <div className="flex-1 mt-2 min-h-[500px]">
          {isLoading && projects.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando proyectos...</span>
            </div>
          ) : viewMode === 'kanban' ? (
            <ProjectsKanbanBoard 
              projects={filteredProjects} 
              onProjectClick={setSelectedProject}
              onMoveProject={(id, newStatus) => updateCommercialStatus(id, newStatus)}
            />
          ) : (
            <ProjectsTableView 
              projects={filteredProjects} 
              onProjectClick={setSelectedProject}
            />
          )}
        </div>
      </div>

      {activeDetailProject && (
        <ProjectDetailDrawer 
          project={activeDetailProject} 
          onClose={() => setSelectedProject(null)} 
          onUpdate={handleUpdateDetail}
          onOpenEditor={handleOpenEditor}
        />
      )}
    </div>
  );
}
