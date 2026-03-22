"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Product {
  productId: string;
  name: string;
  sku: string;
  width: number;
  depth: number;
  height: number;
  price?: number | null;
  pricesMap?: Record<string, number> | null;
  currency?: string;
  hasPriceAccess: boolean;
  thumbnail: string | null;
  metadata?: Record<string, any>;
}

export interface Line {
  lineId: string;
  lineName: string;
  products: Product[];
}

export interface TenantCatalog {
  tenantId: string;
  tenantName: string;
  lines: Line[];
}

interface CatalogState {
  tenants: TenantCatalog[];
  selectedTenantId: string | null;
  selectedLineId: string | null;
  isLoading: boolean;
  searchQuery: string;

  loadCatalog: () => Promise<void>;
  setSelectedTenant: (id: string | null) => void;
  setSelectedLine: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  getFilteredProducts: () => Product[];
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  tenants: [],
  selectedTenantId: null,
  selectedLineId: null,
  isLoading: false,
  searchQuery: '',

  loadCatalog: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<TenantCatalog[]>('/catalog/available');
      set({ 
        tenants: data, 
        isLoading: false,
        selectedTenantId: data.length > 0 ? data[0].tenantId : null,
        selectedLineId: data.length > 0 && data[0].lines.length > 0 ? data[0].lines[0].lineId : null
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  setSelectedTenant: (id) => set((state) => {
    const tenant = state.tenants.find(t => t.tenantId === id);
    const firstLineId = tenant && tenant.lines.length > 0 ? tenant.lines[0].lineId : null;
    return { selectedTenantId: id, selectedLineId: firstLineId };
  }),

  setSelectedLine: (id) => set({ selectedLineId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredProducts: () => {
    const { tenants, selectedTenantId, selectedLineId, searchQuery } = get();
    
    // Si hay búsqueda global, ignoramos todos los filtros e inspeccionamos todo el catálogo.
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const allProducts = tenants.flatMap((t) =>
        t.lines.flatMap((l) =>
          l.products.map((p) => ({
            ...p,
            _tenant: { id: t.tenantId, name: t.tenantName },
            _line: { id: l.lineId, name: l.lineName },
          }))
        )
      );

      return allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p._tenant.name.toLowerCase().includes(q) ||
          p._line.name.toLowerCase().includes(q)
      );
    }

    // Flujo normal con filtros
    let products: any[] = [];
    if (selectedTenantId) {
      const tenant = tenants.find(t => t.tenantId === selectedTenantId);
      if (tenant) {
        if (selectedLineId) {
          const line = tenant.lines.find(l => l.lineId === selectedLineId);
          if (line) {
            products = line.products.map(p => ({
                 ...p, 
                 _tenant: { id: tenant.tenantId, name: tenant.tenantName }, 
                 _line: { id: line.lineId, name: line.lineName }
            }));
          }
        } else {
          products = tenant.lines.flatMap(l => 
            l.products.map(p => ({
               ...p, 
               _tenant: { id: tenant.tenantId, name: tenant.tenantName }, 
               _line: { id: l.lineId, name: l.lineName }
            }))
          );
        }
      }
    } else {
      products = tenants.flatMap(t => 
        t.lines.flatMap(l => 
          l.products.map(p => ({
             ...p, 
             _tenant: { id: t.tenantId, name: t.tenantName }, 
             _line: { id: l.lineId, name: l.lineName }
          }))
        )
      );
    }

    return products;
  }
}));
