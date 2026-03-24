/**
 * Creado y diseñado por XO
 */

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
  // Precio base en la lista de precios asignada al usuario (sin markup)
  price?: number | null;
  // Precio de venta final (con markup del distribuidor aplicado si aplica)
  finalPrice?: number | null;
  // Lista de precios activa para este usuario ('A'|'B'|'C'|'D'|'E')
  priceListType?: string;
  // Mapa completo de precios base para todos los tipos (solo visible para admin del fabricante)
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
    
    // Si no hay tenant seleccionado, no hay nada que mostrar en Nivel 3.
    if (!selectedTenantId) return [];
    
    const tenant = tenants.find(t => t.tenantId === selectedTenantId);
    if (!tenant) return [];
    
    // Si no hay línea, usar la primera por defecto si existe
    const activeLineId = selectedLineId || (tenant.lines.length > 0 ? tenant.lines[0].lineId : null);
    if (!activeLineId) return [];
    
    const line = tenant.lines.find(l => l.lineId === activeLineId);
    if (!line) return [];
    
    // Extraemos solo los productos del contexto activo Exacto (Marca > Línea)
    let products = line.products.map(p => ({
        ...p, 
        _tenant: { id: tenant.tenantId, name: tenant.tenantName }, 
        _line: { id: line.lineId, name: line.lineName }
    }));
    
    // Si hay búsqueda, filtra SOLO dentro del contexto activo para no romper la navegación visual (Figma Style)
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        products = products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q)
        );
    }

    return products;
  }
}));
