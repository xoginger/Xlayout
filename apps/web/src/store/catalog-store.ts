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
  price: number | null;
  hasPriceAccess: boolean;
  thumbnail: string | null;
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
    
    let products: Product[] = [];
    
    if (selectedTenantId) {
      const tenant = tenants.find(t => t.tenantId === selectedTenantId);
      if (tenant) {
        if (selectedLineId) {
          const line = tenant.lines.find(l => l.lineId === selectedLineId);
          if (line) products = line.products;
        } else {
          // All products from all lines in this tenant
          products = tenant.lines.flatMap(l => l.products);
        }
      }
    } else {
      // All products from all tenants
      products = tenants.flatMap(t => t.lines.flatMap(l => l.products));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q)
      );
    }

    return products;
  }
}));
