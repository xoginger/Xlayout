/**
 * Creado y diseñado por XO
 */

import { create } from 'zustand';
import { ProjectListing, projectService } from '@/services/project-service';

interface ProjectsState {
  projects: ProjectListing[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  updateCommercialStatus: (id: string, status: string) => Promise<void>;
  updateOperationalStatus: (id: string, status: string) => Promise<void>;
  updateProject: (id: string, data: Partial<ProjectListing>) => Promise<void>;
  createProject: (data: Partial<ProjectListing>) => Promise<ProjectListing | null>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.listProjects();
      set({ projects, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error al cargar proyectos', isLoading: false });
    }
  },

  updateCommercialStatus: async (id: string, status: string) => {
    // Optimistic update
    const previousProjects = get().projects;
    set({
      projects: previousProjects.map((p) =>
        p.id === id ? { ...p, commercialStatus: status } : p
      ),
    });

    try {
      await projectService.updateCommercialStatus(id, status);
    } catch (err: any) {
      // Revert if API fails
      set({ projects: previousProjects, error: err.message || 'Error al actualizar estado comercial' });
    }
  },

  updateOperationalStatus: async (id: string, status: string) => {
    // Optimistic update
    const previousProjects = get().projects;
    set({
      projects: previousProjects.map((p) =>
        p.id === id ? { ...p, operationalStatus: status } : p
      ),
    });

    try {
      await projectService.updateOperationalStatus(id, status);
    } catch (err: any) {
      // Revert si falla
      set({ projects: previousProjects, error: err.message || 'Error al actualizar estado operativo' });
    }
  },

  updateProject: async (id: string, data: Partial<ProjectListing>) => {
    const previousProjects = get().projects;
    set({
      projects: previousProjects.map((p) =>
        p.id === id ? { ...p, ...data } : p
      ),
    });

    try {
      await projectService.updateProject(id, data);
    } catch (err: any) {
      set({ projects: previousProjects, error: err.message || 'Error al actualizar proyecto' });
    }
  },

  createProject: async (data: Partial<ProjectListing>) => {
    try {
      const newProject = await projectService.createProject(data);
      set((state) => ({ projects: [newProject, ...state.projects] }));
      return newProject;
    } catch (err: any) {
      set({ error: err.message || 'Error al crear proyecto' });
      return null;
    }
  }
}));
