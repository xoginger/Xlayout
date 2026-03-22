/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityName: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
}

interface AuditState {
  logs: AuditLog[];
  isLoading: boolean;

  fetchLogs: (filters?: any) => Promise<void>;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  isLoading: false,

  fetchLogs: async (filters) => {
    set({ isLoading: true });
    try {
      const logs = await api.get<AuditLog[]>('/audit-logs', filters);
      set({ logs, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  }
}));
