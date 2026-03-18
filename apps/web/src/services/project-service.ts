"use client";

import { api } from '../lib/api';

export interface ProjectListing {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    versions: number;
  };
}

export const projectService = {
  async listProjects() {
    return api.get<ProjectListing[]>('/projects');
  },

  async getProject(id: string) {
    return api.get<any>(`/projects/${id}`);
  },

  async createProject(name: string, description?: string) {
    return api.post<any>('/projects', { name, description });
  },

  async saveVersion(projectId: string, sceneState: any) {
    return api.post<any>(`/projects/${projectId}/versions`, { sceneState });
  },

  async updateProject(id: string, updates: { name?: string; description?: string }) {
    return api.patch<any>(`/projects/${id}`, updates);
  },

  async deleteProject(id: string) {
    return api.delete<any>(`/projects/${id}`);
  },

  async duplicateProject(id: string) {
    return api.post<any>(`/projects/${id}/duplicate`, {});
  }
};
