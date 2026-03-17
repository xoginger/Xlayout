"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ActivationCode {
  id: string;
  code: string;
  catalogEnabled: boolean;
  pricesEnabled: boolean;
  conditionsEnabled: boolean;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
}

export interface CatalogAccess {
  id: string;
  endUserId: string;
  tenantId: string;
  catalogEnabled: boolean;
  pricesEnabled: boolean;
  active: boolean;
}

interface AccessState {
  codes: ActivationCode[];
  accesses: CatalogAccess[];
  isLoading: boolean;

  fetchCodes: () => Promise<void>;
  createCode: (data: Partial<ActivationCode>) => Promise<ActivationCode>;
  deactivateCode: (id: string) => Promise<void>;
  
  fetchAccesses: () => Promise<void>;
  revokeAccess: (id: string) => Promise<void>;
}

export const useAccessStore = create<AccessState>((set) => ({
  codes: [],
  accesses: [],
  isLoading: false,

  fetchCodes: async () => {
    set({ isLoading: true });
    try {
      const codes = await api.get<ActivationCode[]>('/activation-codes');
      set({ codes, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createCode: async (data) => {
    const newCode = await api.post<ActivationCode>('/activation-codes', data);
    set((state) => ({ codes: [newCode, ...state.codes] }));
    return newCode;
  },

  deactivateCode: async (id) => {
    await api.delete(`/activation-codes/${id}`);
    set((state) => ({
      codes: state.codes.map(c => c.id === id ? { ...c, active: false } : c)
    }));
  },

  fetchAccesses: async () => {
    const accesses = await api.get<CatalogAccess[]>('/catalog-accesses');
    set({ accesses });
  },

  revokeAccess: async (id) => {
    await api.delete(`/catalog-accesses/${id}`);
    set((state) => ({
      accesses: state.accesses.filter(a => a.id !== id)
    }));
  }
}));
