/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ProductVariant {
  variantId: string;
  name: string;
  sku: string;
  variantType: string; // 'color'|'texture'|'material'|'finish'|'size'|'config'
  width: number;
  depth: number;
  height: number;
  price?: number | null;
  authorizedPrice?: number | null; // Precio autorizado (con descuento de marca)
  finalPrice?: number | null;
  discountPercent?: number; // Descuento de marca aplicado
  proMarkup?: number; // Markup PRO aplicado (0 si STANDARD)
  pricesMap?: Record<string, number> | null;
  hasPriceAccess: boolean;
  currency?: string;
}

export interface Product {
  productId: string;
  name: string;
  sku: string;
  width: number;
  depth: number;
  height: number;
  // Precio base en la lista de precios asignada al usuario (sin descuento)
  price?: number | null;
  // Precio autorizado (con descuento de marca aplicado)
  authorizedPrice?: number | null;
  // Precio de venta final (con markup del distribuidor PRO si aplica)
  finalPrice?: number | null;
  // Descuento de marca aplicado (%)
  discountPercent?: number;
  // Markup PRO aplicado (%) — 0 si STANDARD
  proMarkup?: number;
  // Lista de precios activa para este usuario ('A'|'B'|'C'|'D'|'E')
  priceListType?: string;
  // Listas de precio permitidas para este distribuidor-marca
  allowedPriceLists?: string[];
  // Mapa completo de precios base para todos los tipos (solo visible para admin del fabricante)
  pricesMap?: Record<string, number> | null;
  currency?: string;
  hasPriceAccess: boolean;
  thumbnail: string | null;
  metadata?: Record<string, any>;
  // Variantes del producto base
  variants?: ProductVariant[];
}

export interface Line {
  lineId: string;
  lineName: string;
  products: Product[];
}

export interface TenantCatalog {
  tenantId: string;
  tenantName: string;
  distributorPlan?: string; // 'STANDARD' | 'PRO'
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
  getAllProducts: () => Product[];
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
    return { selectedTenantId: id, selectedLineId: firstLineId, searchQuery: '' };
  }),

  setSelectedLine: (id) => set({ selectedLineId: id, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  /** Retorna TODOS los productos de todos los tenants con metadata de contexto */
  getAllProducts: () => {
    const { tenants } = get();
    const all: any[] = [];
    for (const tenant of tenants) {
      for (const line of tenant.lines) {
        for (const product of line.products) {
          all.push({
            ...product,
            _tenant: { id: tenant.tenantId, name: tenant.tenantName },
            _line: { id: line.lineId, name: line.lineName },
          });
        }
      }
    }
    return all;
  },

  getFilteredProducts: () => {
    const { tenants, selectedTenantId, selectedLineId, searchQuery } = get();
    
    // ─── Búsqueda global fuzzy ─────────────────────────────────────────
    // Cuando hay búsqueda, buscar en TODOS los productos de TODOS los tenants
    if (searchQuery && searchQuery.trim().length > 0) {
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/);
      const all: any[] = [];
      
      for (const tenant of tenants) {
        for (const line of tenant.lines) {
          for (const product of line.products) {
            // Texto de búsqueda combinado: nombre + SKU + línea + marca
            const searchText = [
              product.name,
              product.sku,
              line.lineName,
              tenant.tenantName,
            ].join(' ').toLowerCase();
            
            // Todos los tokens deben coincidir (AND lógico)
            const matches = tokens.every(token => searchText.includes(token));
            
            if (matches) {
              all.push({
                ...product,
                _tenant: { id: tenant.tenantId, name: tenant.tenantName },
                _line: { id: line.lineId, name: line.lineName },
              });
            }
          }
        }
      }
      return all;
    }
    
    // ─── Navegación por marca/línea ────────────────────────────────────
    if (!selectedTenantId) return [];
    
    const tenant = tenants.find(t => t.tenantId === selectedTenantId);
    if (!tenant) return [];
    
    // Si no hay línea seleccionada, mostrar TODOS los productos de la marca
    if (!selectedLineId) {
      const allInTenant: any[] = [];
      for (const line of tenant.lines) {
        for (const product of line.products) {
          allInTenant.push({
            ...product,
            _tenant: { id: tenant.tenantId, name: tenant.tenantName },
            _line: { id: line.lineId, name: line.lineName },
          });
        }
      }
      return allInTenant;
    }
    
    const line = tenant.lines.find(l => l.lineId === selectedLineId);
    if (!line) return [];
    
    return line.products.map(p => ({
      ...p,
      _tenant: { id: tenant.tenantId, name: tenant.tenantName },
      _line: { id: line.lineId, name: line.lineName },
    }));
  }
}));
