/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

// Representa una empresa distribuidora registrada en el sistema
export interface DistributorCompany {
  id: string;
  name: string;
  slug: string;
  contactEmail?: string;
  phone?: string;
  country?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  // Contadores de usuarios y accesos (devueltos por el backend con _count)
  _count?: {
    users: number;
    manufacturerAccesses: number;
  };
}

// Acceso de un distribuidor al catálogo de un fabricante
export interface DistributorCatalogAccess {
  id: string;
  distributorId: string;
  tenantId: string;
  priceListType: string; // 'A'|'B'|'C'|'D'|'E'
  active: boolean;
  tenant: { id: string; name: string };
}

// Regla de markup del distribuidor
export interface DistributorMarkup {
  id: string;
  distributorId: string;
  scope: 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT';
  markupPercent: number;
  tenantId?: string;
  productLineId?: string;
  productId?: string;
  priority: number;
  active: boolean;
}

interface DistributorStore {
  distributors: DistributorCompany[];
  selectedDistributor: DistributorCompany | null;
  isLoading: boolean;

  // Cargar todos los distribuidores del sistema
  fetchDistributors: () => Promise<void>;
  // Cargar el detalle de un distribuidor
  fetchDistributor: (id: string) => Promise<any>;
  // Crear un nuevo distribuidor
  createDistributor: (data: Partial<DistributorCompany>) => Promise<DistributorCompany>;
  // Autorizar a un distribuidor para acceder al catálogo del fabricante actual
  grantCatalogAccess: (distributorId: string, priceListType: string, notes?: string) => Promise<DistributorCatalogAccess>;
  // Revocar acceso al catálogo
  revokeCatalogAccess: (distributorId: string) => Promise<void>;
  // Crear una regla de markup para un distribuidor
  setMarkup: (distributorId: string, data: Partial<DistributorMarkup>) => Promise<DistributorMarkup>;
  // Desactivar una regla de markup
  deactivateMarkup: (distributorId: string, markupId: string) => Promise<void>;
}

export const useDistributorStore = create<DistributorStore>((set) => ({
  distributors: [],
  selectedDistributor: null,
  isLoading: false,

  fetchDistributors: async () => {
    set({ isLoading: true });
    try {
      const distributors = await api.get<DistributorCompany[]>('/distributors');
      set({ distributors, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchDistributor: async (id: string) => {
    set({ isLoading: true });
    try {
      const distributor = await api.get<any>(`/distributors/${id}`);
      set({ selectedDistributor: distributor, isLoading: false });
      return distributor;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  createDistributor: async (data) => {
    const newDistributor = await api.post<DistributorCompany>('/distributors', data);
    set((state) => ({
      distributors: [newDistributor, ...state.distributors],
    }));
    return newDistributor;
  },

  grantCatalogAccess: async (distributorId, priceListType, notes) => {
    return api.post<DistributorCatalogAccess>(
      `/distributors/${distributorId}/grant-access`,
      { priceListType, notes },
    );
  },

  revokeCatalogAccess: async (distributorId) => {
    await api.delete(`/distributors/${distributorId}/revoke-access`);
  },

  setMarkup: async (distributorId, data) => {
    return api.post<DistributorMarkup>(
      `/distributors/${distributorId}/markup`,
      data,
    );
  },

  deactivateMarkup: async (distributorId, markupId) => {
    await api.delete(`/distributors/${distributorId}/markup/${markupId}`);
  },
}));
