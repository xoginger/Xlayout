"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  logoUrl?: string;
  createdAt: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalProducts: number;
}

interface PlatformState {
  tenants: Tenant[];
  metrics: PlatformMetrics | null;
  isLoading: boolean;
  error: string | null;

  fetchTenants: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createTenant: (data: Partial<Tenant> & { 
    adminEmail?: string; 
    adminPassword?: string; 
    adminFirstName?: string; 
    adminLastName?: string 
  }) => Promise<Tenant>;
  suspendTenant: (id: string) => Promise<void>;
  activateTenant: (id: string) => Promise<void>;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  tenants: [],
  metrics: null,
  isLoading: false,
  error: null,

  fetchTenants: async () => {
    set({ isLoading: true, error: null });
    try {
      const tenants = await api.get<Tenant[]>('/tenants');
      set({ tenants, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMetrics: async () => {
    try {
      // Assuming a /platform/metrics endpoint exists or implementing it soon
      const metrics = await api.get<PlatformMetrics>('/platform/info/metrics');
      set({ metrics });
    } catch (err) {
      // Fallback or ignore for now
    }
  },

  createTenant: async (data) => {
    set({ isLoading: true });
    try {
      const newTenant = await api.post<Tenant>('/tenants', data);
      set((state) => ({ 
        tenants: [newTenant, ...state.tenants], 
        isLoading: false 
      }));
      return newTenant;
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  suspendTenant: async (id) => {
    await api.patch(`/tenants/${id}/suspend`, {});
    set((state) => ({
      tenants: state.tenants.map(t => t.id === id ? { ...t, status: 'SUSPENDED' } : t)
    }));
  },

  activateTenant: async (id) => {
    await api.patch(`/tenants/${id}/activate`, {});
    set((state) => ({
      tenants: state.tenants.map(t => t.id === id ? { ...t, status: 'ACTIVE' } : t)
    }));
  }
}));
