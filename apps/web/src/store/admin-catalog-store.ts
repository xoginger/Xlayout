"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ProductLine {
  id: string;
  name: string;
  slug: string;
  category?: string;
  active: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  lineId: string;
  categoryId: string;
  width: number;
  depth: number;
  height: number;
  active: boolean;
}

export interface ProductAsset {
  id: string;
  tenantId: string;
  productId: string;
  assetType: 'image' | 'model_3d' | 'footprint_svg' | 'thumbnail';
  fileUrl?: string;
  thumbnailUrl?: string;
  footprint2dUrl?: string;
  model3dUrl?: string;
  product?: Product;
}

export interface ProductCondition {
  id: string;
  tenantId: string;
  productId?: string;
  lineId?: string;
  conditionType: 'warranty' | 'delivery' | 'commercial' | 'custom';
  description: string;
  active: boolean;
  product?: Product;
  line?: ProductLine;
}

export interface ProductPrice {
  id: string;
  tenantId: string;
  productId: string;
  currency: string;
  basePrice: number | string;
  active: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  product?: Product;
}

interface CatalogState {
  lines: ProductLine[];
  categories: ProductCategory[];
  products: Product[];
  assets: ProductAsset[];
  conditions: ProductCondition[];
  prices: ProductPrice[];
  isLoading: boolean;

  fetchLines: () => Promise<void>;
  createLine: (name: string) => Promise<ProductLine>;
  
  fetchCategories: () => Promise<void>;
  createCategory: (name: string, parentId?: string) => Promise<ProductCategory>;
  updateCategoryStatus: (id: string, active: boolean) => Promise<void>;

  fetchProducts: (filters?: any) => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<Product>;
  updateProductStatus: (id: string, active: boolean) => Promise<void>;
  
  updateLineStatus: (id: string, active: boolean) => Promise<void>;

  fetchAssets: () => Promise<void>;
  createAsset: (data: Partial<ProductAsset>) => Promise<ProductAsset>;

  fetchConditions: () => Promise<void>;
  createCondition: (data: Partial<ProductCondition>) => Promise<ProductCondition>;
  updateConditionStatus: (id: string, active: boolean) => Promise<void>;

  fetchPrices: () => Promise<void>;
  createProductPrice: (productId: string, data: Partial<ProductPrice>) => Promise<ProductPrice>;
  updatePriceStatus: (id: string, active: boolean) => Promise<void>;
}

export const useAdminCatalogStore = create<CatalogState>((set) => ({
  lines: [],
  categories: [],
  products: [],
  assets: [],
  conditions: [],
  prices: [],
  isLoading: false,

  fetchLines: async () => {
    set({ isLoading: true });
    try {
      const lines = await api.get<ProductLine[]>('/catalog/lines');
      set({ lines, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createLine: async (name) => {
    const newLine = await api.post<ProductLine>('/catalog/lines', { name });
    set((state) => ({ lines: [...state.lines, newLine] }));
    return newLine;
  },

  fetchCategories: async () => {
    const categories = await api.get<ProductCategory[]>('/catalog/categories');
    set({ categories });
  },

  createCategory: async (name, parentId) => {
    const newCat = await api.post<ProductCategory>('/catalog/categories', { name, parentId });
    set((state) => ({ categories: [...state.categories, newCat] }));
    return newCat;
  },

  updateCategoryStatus: async (id, active) => {
    await api.patch(`/catalog/categories/${id}/status`, { active });
    set((state) => ({
      categories: state.categories.map(c => c.id === id ? { ...c, active } : c)
    }));
  },

  fetchProducts: async (filters) => {
    set({ isLoading: true });
    try {
      const products = await api.get<Product[]>('/catalog/products', filters);
      set({ products, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createProduct: async (data) => {
    const newProd = await api.post<Product>('/catalog/products', data);
    set((state) => ({ products: [...state.products, newProd] }));
    return newProd;
  },

  updateProductStatus: async (id, active) => {
    await api.patch(`/catalog/products/${id}/status`, { active });
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, active } : p)
    }));
  },

  updateLineStatus: async (id, active) => {
    await api.patch(`/catalog/lines/${id}/status`, { active });
    set((state) => ({
      lines: state.lines.map(l => l.id === id ? { ...l, active } : l)
    }));
  },

  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      const assets = await api.get<ProductAsset[]>('/catalog/assets');
      set({ assets, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createAsset: async (data) => {
    const newAsset = await api.post<ProductAsset>('/catalog/assets', data);
    set((state) => ({ assets: [...state.assets, newAsset] }));
    return newAsset;
  },

  fetchConditions: async () => {
    set({ isLoading: true });
    try {
      const conditions = await api.get<ProductCondition[]>('/catalog/conditions');
      set({ conditions, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createCondition: async (data) => {
    const newCond = await api.post<ProductCondition>('/catalog/conditions', data);
    set((state) => ({ conditions: [...state.conditions, newCond] }));
    return newCond;
  },

  updateConditionStatus: async (id, active) => {
    await api.patch(`/catalog/conditions/${id}/status`, { active });
    set((state) => ({
      conditions: state.conditions.map(c => c.id === id ? { ...c, active } : c)
    }));
  },

  fetchPrices: async () => {
    set({ isLoading: true });
    try {
      const prices = await api.get<ProductPrice[]>('/catalog/prices');
      set({ prices, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createProductPrice: async (productId, data) => {
    const newPrice = await api.post<ProductPrice>(`/catalog/products/${productId}/prices`, data);
    set((state) => ({ prices: [...state.prices, newPrice] }));
    return newPrice;
  },

  updatePriceStatus: async (id, active) => {
    await api.patch(`/catalog/prices/${id}/status`, { active });
    set((state) => ({
      prices: state.prices.map(p => p.id === id ? { ...p, active } : p)
    }));
  }
}));
