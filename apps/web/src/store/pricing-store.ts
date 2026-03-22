/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ProductPrice {
  id: string;
  productId: string;
  basePrice: number;
  currency: string;
  validFrom?: string;
  validTo?: string;
  active: boolean;
}

interface PricingState {
  prices: ProductPrice[];
  isLoading: boolean;

  fetchPrices: (productId: string) => Promise<void>;
  createPrice: (productId: string, data: Partial<ProductPrice>) => Promise<ProductPrice>;
  deactivatePrice: (id: string) => Promise<void>;
}

export const usePricingStore = create<PricingState>((set) => ({
  prices: [],
  isLoading: false,

  fetchPrices: async (productId) => {
    set({ isLoading: true });
    try {
      const prices = await api.get<ProductPrice[]>(`/catalog/products/${productId}/prices`);
      set({ prices, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createPrice: async (productId, data) => {
    const newPrice = await api.post<ProductPrice>(`/catalog/products/${productId}/prices`, data);
    set((state) => ({ prices: [newPrice, ...state.prices] }));
    return newPrice;
  },

  deactivatePrice: async (id) => {
    // Asumiendo un endpoint de desactivación
    await api.patch(`/catalog/prices/${id}/deactivate`, {});
    set((state) => ({
      prices: state.prices.map(p => p.id === id ? { ...p, active: false } : p)
    }));
  }
}));
