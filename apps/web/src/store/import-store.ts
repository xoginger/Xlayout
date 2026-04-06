/**
 * Creado y diseñado por XO
 * XLayout System — Store de Importaciones
 *
 * Estado global para el módulo de importaciones masivas.
 * Conecta con los endpoints /imports del backend.
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

// Resumen detallado de una importación
export interface ImportSummary {
  success: boolean;
  type: string;
  dryRun: boolean;
  total: number;
  succeeded: number;
  failed: number;
  created: number;
  updated: number;
  variantsCreated: number;
  linesCreated: string[];
  categoriesCreated: string[];
  errors: string[];
  warnings: string[];
  error?: string;
}

// Job de importación
export interface ImportJob {
  id: string;
  tenantId: string;
  type: string;
  filename: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  summary: ImportSummary | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportState {
  jobs: ImportJob[];
  isLoading: boolean;

  fetchJobs: () => Promise<void>;
  uploadFile: (formData: FormData) => Promise<{ jobId: string; message: string }>;
  previewFile: (formData: FormData) => Promise<{ jobId: string; message: string }>;
  getJobStatus: (jobId: string) => Promise<any>;
}

export const useImportStore = create<ImportState>((set) => ({
  jobs: [],
  isLoading: false,

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      const jobs = await api.get<ImportJob[]>('/imports');
      set({ jobs: Array.isArray(jobs) ? jobs : [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  uploadFile: async (formData) => {
    set({ isLoading: true });
    try {
      const result = await api.post<{ jobId: string; message: string }>('/imports/upload', formData);
      return result;
    } finally {
      set({ isLoading: false });
    }
  },

  previewFile: async (formData) => {
    set({ isLoading: true });
    try {
      const result = await api.post<{ jobId: string; message: string }>('/imports/preview', formData);
      return result;
    } finally {
      set({ isLoading: false });
    }
  },

  getJobStatus: async (jobId: string) => {
    return api.get(`/imports/${jobId}/status`);
  },
}));
