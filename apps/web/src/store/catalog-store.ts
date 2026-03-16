"use client";

/**
 * XLayout Catalog Store — Scalable Architecture
 * ----------------------------------------------
 * Fully separated from editor-store.
 * Manages: brands, product lines, product definitions.
 * Does NOT hold 3D assets — those are lazy-loaded via ProductAssetSet.
 */

import { create } from 'zustand';
import type { Brand, ProductLine, ProductDefinition, CatalogFilters, ProductCategory } from '@/types/catalog';
import { MOCK_BRANDS, MOCK_LINES, MOCK_PRODUCTS } from '@/data/catalog-mock';

interface CatalogState {
  // Data layers
  brands: Brand[];
  lines: ProductLine[];
  products: ProductDefinition[];

  // Selection / Navigation
  selectedBrandId: string | null;
  selectedLineId: string | null;

  // Search & filters
  filters: CatalogFilters;

  // Loading state (for future async/pagination)
  isLoading: boolean;

  // ──────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────
  loadCatalogMockData: () => void;

  setSelectedBrand: (brandId: string | null) => void;
  setSelectedLine: (lineId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (patch: Partial<CatalogFilters>) => void;
  clearFilters: () => void;

  // Computed selectors (memoized outside for perf)
  getLinesByBrand: (brandId: string) => ProductLine[];
  getProductsByLine: (lineId: string) => ProductDefinition[];
  getProductsByBrand: (brandId: string) => ProductDefinition[];
  getFilteredProducts: () => ProductDefinition[];
  getProductById: (id: string) => ProductDefinition | undefined;
  getBrandById: (id: string) => Brand | undefined;
  getLineById: (id: string) => ProductLine | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  brands: [],
  lines: [],
  products: [],

  selectedBrandId: null,
  selectedLineId: null,

  filters: {},
  isLoading: false,

  // ──────────────────────────────────────────────────────────
  // Load mock data (replaces future API call)
  // ──────────────────────────────────────────────────────────
  loadCatalogMockData: () => {
    set({
      brands: MOCK_BRANDS,
      lines: MOCK_LINES,
      products: MOCK_PRODUCTS,
      selectedBrandId: MOCK_BRANDS[0]?.id ?? null,
      selectedLineId: null,
    });
  },

  // ──────────────────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────────────────
  setSelectedBrand: (brandId) => set({ selectedBrandId: brandId, selectedLineId: null }),
  setSelectedLine: (lineId) => set({ selectedLineId: lineId }),

  // ──────────────────────────────────────────────────────────
  // Search & Filter
  // ──────────────────────────────────────────────────────────
  setSearchQuery: (query) =>
    set((s) => ({ filters: { ...s.filters, searchQuery: query } })),

  setFilter: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  clearFilters: () =>
    set((s) => ({ filters: { brandId: s.selectedBrandId ?? undefined, lineId: s.selectedLineId ?? undefined } })),

  // ──────────────────────────────────────────────────────────
  // Selectors
  // ──────────────────────────────────────────────────────────
  getLinesByBrand: (brandId) =>
    get().lines.filter((l) => l.brandId === brandId),

  getProductsByLine: (lineId) =>
    get().products.filter((p) => p.lineId === lineId),

  getProductsByBrand: (brandId) =>
    get().products.filter((p) => p.brandId === brandId),

  getFilteredProducts: () => {
    const { products, selectedBrandId, selectedLineId, filters } = get();
    return products.filter((p) => {
      if (selectedBrandId && p.brandId !== selectedBrandId) return false;
      if (selectedLineId && p.lineId !== selectedLineId) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.sku.toLowerCase().includes(q) &&
          !(p.tags ?? []).some((t) => t.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  },

  getProductById: (id) => get().products.find((p) => p.id === id),
  getBrandById: (id) => get().brands.find((b) => b.id === id),
  getLineById: (id) => get().lines.find((l) => l.id === id),
}));
