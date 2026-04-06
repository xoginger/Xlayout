/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

// Representa la relación completa entre una marca y un distribuidor
export interface ManufacturerDistributorRelationship {
  tenantId: string;
  tenantName: string;
  distributorId: string;
  access: {
    id: string;
    active: boolean;
    defaultPriceList: string;
    grantedAt: string;
    expiresAt?: string;
    notes?: string;
  } | null;
  allowedPriceLists: Array<{
    id: string;
    priceListType: string;
    isDefault: boolean;
    active: boolean;
  }>;
  discounts: Array<{
    id: string;
    discountPercent: number;
    scope: 'GLOBAL' | 'BY_LINE' | 'BY_PRODUCT';
    productLineId?: string;
    productId?: string;
    active: boolean;
  }>;
}

// Regla de pricing PRO
export interface ProPricingRule {
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

// Configuración de branding del distribuidor PRO
export interface BrandingConfig {
  id: string;
  distributorId: string;
  logoUrl?: string;
  companyName?: string;
  primaryColor: string;
  accentColor: string;
  address?: string;
  phone?: string;
  email?: string;
  rfc?: string;
  website?: string;
}

interface ManufacturerDistributorState {
  relationships: ManufacturerDistributorRelationship[];
  selectedRelationship: ManufacturerDistributorRelationship | null;
  proPricingRules: ProPricingRule[];
  brandingConfig: BrandingConfig | null;
  isLoading: boolean;

  // Cargar distribuidores autorizados para el fabricante actual
  fetchAuthorizedDistributors: () => Promise<void>;
  // Cargar marcas autorizadas para un distribuidor
  fetchAuthorizedBrands: (distributorId: string) => Promise<void>;
  // Cargar resumen de relación
  fetchRelationshipSummary: (distributorId: string, tenantId: string) => Promise<ManufacturerDistributorRelationship>;

  // Otorgar acceso a un distribuidor
  grantAccess: (distributorId: string, data: {
    priceListTypes: string[];
    defaultPriceList: string;
    notes?: string;
  }) => Promise<void>;
  // Revocar acceso a un distribuidor
  revokeAccess: (distributorId: string) => Promise<void>;

  // Gestión de listas de precio permitidas
  assignPriceLists: (distributorId: string, priceLists: Array<{ priceListType: string; isDefault?: boolean }>) => Promise<void>;
  revokePriceList: (distributorId: string, priceListType: string) => Promise<void>;

  // Gestión de descuentos
  assignDiscount: (distributorId: string, data: {
    discountPercent: number;
    scope?: 'GLOBAL' | 'BY_LINE' | 'BY_PRODUCT';
    productLineId?: string;
    productId?: string;
  }) => Promise<void>;
  updateDiscount: (distributorId: string, discountId: string, data: {
    discountPercent?: number;
    active?: boolean;
  }) => Promise<void>;

  // Gestión de reglas PRO
  setProPricingRule: (distributorId: string, data: Partial<ProPricingRule>) => Promise<ProPricingRule>;
  deactivateProPricingRule: (distributorId: string, ruleId: string) => Promise<void>;

  // Branding PRO
  upsertBranding: (distributorId: string, data: Partial<BrandingConfig>) => Promise<BrandingConfig>;
}

export const useManufacturerDistributorStore = create<ManufacturerDistributorState>((set) => ({
  relationships: [],
  selectedRelationship: null,
  proPricingRules: [],
  brandingConfig: null,
  isLoading: false,

  fetchAuthorizedDistributors: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<any[]>('/distributors/by-tenant/authorized');
      const relationships: ManufacturerDistributorRelationship[] = data.map((item: any) => ({
        tenantId: item.tenantId,
        tenantName: item.tenant?.name || '',
        distributorId: item.distributorId,
        access: {
          id: item.id,
          active: item.active,
          defaultPriceList: item.defaultPriceList || 'A',
          grantedAt: item.grantedAt,
          expiresAt: item.expiresAt,
          notes: item.notes,
        },
        allowedPriceLists: item.distributor?.allowedPriceLists || [],
        discounts: item.distributor?.discounts || [],
      }));
      set({ relationships, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchAuthorizedBrands: async (distributorId: string) => {
    set({ isLoading: true });
    try {
      const data = await api.get<any[]>(`/distributors/${distributorId}/authorized-brands`);
      const relationships: ManufacturerDistributorRelationship[] = data.map((item: any) => ({
        tenantId: item.tenantId,
        tenantName: item.tenant?.name || '',
        distributorId: item.distributorId,
        access: {
          id: item.id,
          active: item.active,
          defaultPriceList: item.defaultPriceList || 'A',
          grantedAt: item.grantedAt,
          expiresAt: item.expiresAt,
          notes: item.notes,
        },
        allowedPriceLists: item.allowedPriceLists || [],
        discounts: item.discounts || [],
      }));
      set({ relationships, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchRelationshipSummary: async (distributorId, tenantId) => {
    set({ isLoading: true });
    try {
      const data = await api.get<any>(`/distributors/${distributorId}/relationship/${tenantId}`);
      const relationship: ManufacturerDistributorRelationship = {
        tenantId: data.access?.tenantId || tenantId,
        tenantName: data.access?.tenant?.name || '',
        distributorId,
        access: data.access,
        allowedPriceLists: data.allowedPriceLists || [],
        discounts: data.discounts || [],
      };
      set({ selectedRelationship: relationship, isLoading: false });
      return relationship;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  grantAccess: async (distributorId, data) => {
    await api.post(`/distributors/${distributorId}/grant-access`, data);
  },

  revokeAccess: async (distributorId) => {
    await api.delete(`/distributors/${distributorId}/revoke-access`);
  },

  assignPriceLists: async (distributorId, priceLists) => {
    await api.post(`/distributors/${distributorId}/allowed-price-lists`, { priceLists });
  },

  revokePriceList: async (distributorId, priceListType) => {
    await api.delete(`/distributors/${distributorId}/allowed-price-lists/${priceListType}`);
  },

  assignDiscount: async (distributorId, data) => {
    await api.post(`/distributors/${distributorId}/discount`, data);
  },

  updateDiscount: async (distributorId, discountId, data) => {
    await api.patch(`/distributors/${distributorId}/discount/${discountId}`, data);
  },

  setProPricingRule: async (distributorId, data) => {
    const rule = await api.post<ProPricingRule>(
      `/distributors/${distributorId}/pro-pricing-rule`,
      data,
    );
    set((state) => ({
      proPricingRules: [rule, ...state.proPricingRules],
    }));
    return rule;
  },

  deactivateProPricingRule: async (distributorId, ruleId) => {
    await api.delete(`/distributors/${distributorId}/pro-pricing-rule/${ruleId}`);
    set((state) => ({
      proPricingRules: state.proPricingRules.filter(r => r.id !== ruleId),
    }));
  },

  upsertBranding: async (distributorId, data) => {
    const config = await api.post<BrandingConfig>(
      `/distributors/${distributorId}/branding`,
      data,
    );
    set({ brandingConfig: config });
    return config;
  },
}));
