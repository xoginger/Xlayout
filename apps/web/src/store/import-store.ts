/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ImportJob {
  id: string;
  filename: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  errorLog?: string;
  createdAt: string;
}

interface ImportState {
  jobs: ImportJob[];
  isLoading: boolean;

  fetchJobs: () => Promise<void>;
  createJob: (formData: FormData) => Promise<ImportJob>;
}

export const useImportStore = create<ImportState>((set) => ({
  jobs: [],
  isLoading: false,

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      const jobs = await api.get<ImportJob[]>('/import-jobs');
      set({ jobs, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createJob: async (formData) => {
    set({ isLoading: true });
    try {
      const newJob = await api.post<ImportJob>('/import-jobs', formData);
      set((state) => ({ jobs: [newJob, ...state.jobs], isLoading: false }));
      return newJob;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  }
}));
