/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ProductLine {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  active: boolean;
  _count?: {
    products: number;
  };
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
  description?: string;
  lineId: string;
  categoryId?: string;
  width: number;
  depth: number;
  height: number;
  active: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  // Unido desde includes
  line?: ProductLine;
  prices?: ProductPrice[];
  assets?: ProductAsset[];
}

export interface ProductAsset {
  id: string;
  tenantId: string;
  productId?: string | null;
  assetType: 'image' | 'model_3d' | 'footprint_svg' | 'thumbnail';
  fileUrl?: string;
  thumbnailUrl?: string;
  footprint2dUrl?: string;
  model3dUrl?: string;
  // ── Pipeline de conversión ──
  originalFileUrl?: string;
  originalFormat?: string;
  conversionStatus?: string;
  conversionError?: string;
  metadata?: Record<string, any>;
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
  priceType: string;
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
  createLine: (name: string, description?: string) => Promise<ProductLine>;
  updateLine: (id: string, data: Partial<ProductLine>) => Promise<ProductLine>;
  updateLineStatus: (id: string, active: boolean) => Promise<void>;
  deleteLine: (id: string) => Promise<void>;
  
  fetchCategories: () => Promise<void>;
  createCategory: (name: string, parentId?: string) => Promise<ProductCategory>;
  updateCategoryStatus: (id: string, active: boolean) => Promise<void>;

  fetchProducts: (filters?: any) => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>;
  updateProductStatus: (id: string, active: boolean) => Promise<void>;
  publishProduct: (id: string) => Promise<void>;
  unpublishProduct: (id: string) => Promise<void>;

  fetchAssets: () => Promise<void>;
  fetchUnlinkedAssets: () => Promise<ProductAsset[]>;
  createAsset: (data: Partial<ProductAsset>) => Promise<ProductAsset>;
  uploadAsset: (file: File, productId: string) => Promise<ProductAsset>;
  retryConversion: (assetId: string) => Promise<void>;
  forceScale: (assetId: string, unit: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  linkAsset: (productId: string, assetId: string) => Promise<void>;
  unlinkAsset: (productId: string, assetId: string) => Promise<void>;

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

  createLine: async (name, description) => {
    const newLine = await api.post<ProductLine>('/catalog/lines', { name, description });
    set((state) => ({ lines: [...state.lines, newLine].sort((a,b) => a.name.localeCompare(b.name)) }));
    return newLine;
  },
  
  updateLine: async (id, data) => {
    const updated = await api.patch<ProductLine>(`/catalog/lines/${id}`, data);
    set((state) => ({
      lines: state.lines.map(l => l.id === id ? updated : l).sort((a,b) => a.name.localeCompare(b.name))
    }));
    return updated;
  },

  updateLineStatus: async (id, active) => {
    await api.patch(`/catalog/lines/${id}/status`, { active });
    set((state) => ({
      lines: state.lines.map(l => l.id === id ? { ...l, active } : l)
    }));
  },

  deleteLine: async (id) => {
    await api.delete(`/catalog/lines/${id}`);
    set((state) => ({
      lines: state.lines.filter(l => l.id !== id)
    }));
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
    set((state) => ({ products: [newProd, ...state.products] }));
    return newProd;
  },

  updateProduct: async (id, data) => {
    const updated = await api.patch<Product>(`/catalog/products/${id}`, data);
    set((state) => ({
      products: state.products.map(p => p.id === id ? updated : p)
    }));
    return updated;
  },

  updateProductStatus: async (id, active) => {
    await api.patch(`/catalog/products/${id}/status`, { active });
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, active } : p)
    }));
  },

  publishProduct: async (id) => {
    await api.patch(`/catalog/products/${id}/publish`, {});
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, status: 'PUBLISHED', active: true } : p)
    }));
  },

  unpublishProduct: async (id) => {
    await api.patch(`/catalog/products/${id}/unpublish`, {});
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, status: 'DRAFT', active: false } : p)
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

  deleteAsset: async (id) => {
    await api.delete(`/catalog/assets/${id}`);
    set((state) => ({
      assets: state.assets.filter(a => a.id !== id)
    }));
  },

  uploadAsset: async (file, productId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);
    const newAsset = await api.post<ProductAsset>('/catalog/assets/upload', formData);
    set((state) => ({ assets: [newAsset, ...state.assets] }));
    return newAsset;
  },

  fetchUnlinkedAssets: async () => {
    return api.get<ProductAsset[]>('/catalog/assets/unlinked');
  },

  linkAsset: async (productId, assetId) => {
    const updatedAsset = await api.post<ProductAsset>(`/catalog/products/${productId}/link-asset`, { assetId });
    // Actualizar el producto en el estado local para reflejar el nuevo asset
    set((state) => ({
      products: state.products.map(p => 
        p.id === productId ? { ...p, assets: [...(p.assets || []).filter(a => a.assetType !== 'model_3d'), updatedAsset] } : p
      )
    }));
  },

  unlinkAsset: async (productId, assetId) => {
    await api.post(`/catalog/products/${productId}/unlink-asset`, { assetId });
    // Quitar el asset del producto en el estado local
    set((state) => ({
      products: state.products.map(p => 
        p.id === productId ? { ...p, assets: (p.assets || []).filter(a => a.id !== assetId) } : p
      )
    }));
  },

  retryConversion: async (assetId) => {
    await api.post(`/catalog/assets/${assetId}/retry-conversion`, {});
    set((state) => ({
      assets: state.assets.map(a =>
        a.id === assetId ? { ...a, conversionStatus: 'uploaded', conversionError: undefined } : a
      ),
    }));
  },

  forceScale: async (assetId, unit) => {
    await api.post(`/catalog/assets/${assetId}/force-scale`, { targetUnit: unit });
    set((state) => ({
      assets: state.assets.map(a =>
        a.id === assetId ? { ...a, conversionStatus: 'processing', conversionError: undefined } : a
      ),
    }));
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
