import { create } from 'zustand';
import { api } from '@/lib/api';

export interface CatalogAccess {
  id: string;
  tenantId: string;
  endUserId: string;
  activationCodeId?: string;
  catalogEnabled: boolean;
  pricesEnabled: boolean;
  conditionsEnabled: boolean;
  validUntil?: string;
  endUser?: any;
}

export interface ActivationCode {
  id: string;
  tenantId: string;
  code: string;
  catalogEnabled: boolean;
  pricesEnabled: boolean;
  conditionsEnabled: boolean;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  _count?: {
    catalogAccesses: number;
  };
}

interface AccessState {
  activationCodes: ActivationCode[];
  catalogAccesses: CatalogAccess[];
  isLoading: boolean;

  fetchActivationCodes: (tenantId: string) => Promise<void>;
  createActivationCode: (data: Partial<ActivationCode>) => Promise<ActivationCode>;
  deactivateCode: (id: string) => Promise<void>;

  fetchCatalogAccesses: (tenantId: string) => Promise<void>;
  grantCatalogAccess: (email: string, permissions: Partial<CatalogAccess>) => Promise<CatalogAccess>;
  revokeCatalogAccess: (tenantId: string, endUserId: string) => Promise<void>;
}

export const useAdminAccessStore = create<AccessState>((set) => ({
  activationCodes: [],
  catalogAccesses: [],
  isLoading: false,

  fetchActivationCodes: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const activationCodes = await api.get<ActivationCode[]>(`/activation-codes/tenant/${tenantId}`);
      set({ activationCodes, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createActivationCode: async (data) => {
    const newCode = await api.post<ActivationCode>('/activation-codes', data);
    set((state) => ({ activationCodes: [newCode, ...state.activationCodes] }));
    return newCode;
  },

  deactivateCode: async (id: string) => {
    await api.delete(`/activation-codes/${id}`);
    set((state) => ({
      activationCodes: state.activationCodes.map(c => c.id === id ? { ...c, active: false } : c)
    }));
  },

  fetchCatalogAccesses: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const catalogAccesses = await api.get<CatalogAccess[]>(`/catalog-access/tenant/${tenantId}`);
      set({ catalogAccesses, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  grantCatalogAccess: async (email: string, permissions: Partial<CatalogAccess>) => {
    const newAccess = await api.post<CatalogAccess>('/catalog-access/by-email', { email, ...permissions });
    // Refetch or update state
    set((state) => {
      // If user already existed, update it, else append
      const existsIdx = state.catalogAccesses.findIndex(a => a.endUserId === newAccess.endUserId);
      if (existsIdx >= 0) {
        const newArr = [...state.catalogAccesses];
        newArr[existsIdx] = newAccess;
        return { catalogAccesses: newArr };
      }
      return { catalogAccesses: [newAccess, ...state.catalogAccesses] };
    });
    return newAccess;
  },

  revokeCatalogAccess: async (tenantId: string, endUserId: string) => {
    await api.delete(`/catalog-access/tenant/${tenantId}/user/${endUserId}`);
    set((state) => ({
      catalogAccesses: state.catalogAccesses.filter(a => a.endUserId !== endUserId)
    }));
  }
}));
