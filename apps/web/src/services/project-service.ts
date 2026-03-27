/**
 * Creado y diseñado por XO
 */

"use client";

import { api } from '../lib/api';

export interface ProjectListing {
  id: string;
  name: string;
  description?: string;
  projectCode?: string;
  clientName?: string;
  clientCompany?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  commercialStatus: string;
  operationalStatus: string;
  priority: string;
  estimatedValue?: number;
  finalValue?: number;
  probability?: number;
  dueDate?: string;
  tags?: any;
  source?: string;
  priceType?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
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

  async createProject(data: Partial<ProjectListing>) {
    return api.post<any>('/projects', data);
  },

  async saveVersion(projectId: string, sceneState: any) {
    return api.post<any>(`/projects/${projectId}/versions`, { sceneState });
  },

  async updateProject(id: string, updates: Partial<ProjectListing>) {
    return api.patch<any>(`/projects/${id}`, updates);
  },

  async updateCommercialStatus(id: string, status: string) {
    return api.patch<any>(`/projects/${id}/commercial-status`, { status });
  },

  async updateOperationalStatus(id: string, status: string) {
    return api.patch<any>(`/projects/${id}/operational-status`, { status });
  },

  async deleteProject(id: string) {
    return api.delete<any>(`/projects/${id}`);
  },

  async duplicateProject(id: string) {
    return api.post<any>(`/projects/${id}/duplicate`, {});
  },

  async getQuotes(projectId: string) {
    return api.get<any[]>(`/projects/${projectId}/quotes`);
  },

  async saveQuote(projectId: string, quoteData: any) {
    return api.post<any>(`/projects/${projectId}/quotes`, quoteData);
  }
};
