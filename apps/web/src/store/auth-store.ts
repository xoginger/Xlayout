/**
 * Creado y diseñado por XO
 * XLayout — Auth Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Store de autenticación con soporte para:
 * - JWT access tokens + refresh tokens
 * - Deduplicación de fetchMe (previene loops infinitos)
 * - Refresh automático de tokens expirados
 * - Compatibilidad cross-domain (xlayout.mx ↔ xlayout.studio)
 */

"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

// Tipos de usuarios del sistema
export type UserType = 'PLATFORM_USER' | 'COMPANY_USER' | 'DISTRIBUTOR_USER' | 'END_USER';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  priceListType?: string;
  access: {
    pricesEnabled: boolean;
    conditionsEnabled: boolean;
  };
}

export interface PriceMarkup {
  id: string;
  scope: 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT';
  markupPercent: number;
  tenantId?: string;
  productLineId?: string;
  productId?: string;
  priority: number;
}

interface User {
  id: string;
  email: string;
  userType: UserType;
  role: 'platform_admin' | 'company_admin' | 'distributor_user' | 'end_user';
  preferences?: any;
  tenants: TenantContext[];
  distributorId?: string;
  distributorName?: string;
  distributorRole?: 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';
  companyRole?: 'TENANT_ADMIN' | 'BUSINESS_OWNER' | 'CATALOG_MANAGER' | 'SALES_USER';
  tenantId?: string;
  platformRole?: 'PLATFORM_OWNER' | 'PLATFORM_ADMIN';
  priceMarkups?: PriceMarkup[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTenantId: string | null;
  activeTenantName: string | null;
  loginUserType: UserType | null;
  
  setAuth: (token: string, userData: any) => void;
  fetchMe: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  updatePreferences: (prefs: any) => Promise<void>;
  setActiveTenantId: (id: string) => void;
  getActiveTenant: () => TenantContext | null;
  getUserType: () => UserType | null;
  getDistributorRole: () => string | null;
  isDistributorUser: () => boolean;
  isPlatformUser: () => boolean;
  isCompanyUser: () => boolean;
  logout: () => void;
}

// ─── Deduplicación de fetchMe ─────────────────────────────────────────────
let _fetchPromise: Promise<void> | null = null;
let _fetchFailed = false;

// ─── Helper: dominio de auth para redirects ───────────────────────────────
export function getAuthDomain(): string {
  if (typeof window === 'undefined') return '';
  return process.env.NEXT_PUBLIC_AUTH_DOMAIN || window.location.origin;
}

export function getStudioDomain(): string {
  return process.env.NEXT_PUBLIC_STUDIO_DOMAIN || 'xlayout.studio';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeTenantId: null,
      activeTenantName: null,
      loginUserType: null,

      setAuth: (token, userData) => {
        _fetchFailed = false;
        _fetchPromise = null;
        set({ 
          token, 
          isAuthenticated: true,
          loginUserType: userData?.userType || null,
        });
      },

      fetchMe: async () => {
        if (_fetchFailed) return;
        if (_fetchPromise) return _fetchPromise;

        const doFetch = async () => {
          set({ isLoading: true });
          try {
            const me = await api.get<User>('/auth/me');
            const currentActiveId = get().activeTenantId;
            
            let activeTenant = null;
            if (currentActiveId) {
              activeTenant = me.tenants.find(t => t.tenantId === currentActiveId) || me.tenants[0];
            } else {
              activeTenant = me.tenants[0];
            }

            _fetchFailed = false;
            set({ 
              user: me, 
              isLoading: false, 
              isAuthenticated: true,
              loginUserType: me.userType || null,
              activeTenantId: activeTenant?.tenantId || null,
              activeTenantName: activeTenant?.tenantName || null
            });
          } catch (err) {
            _fetchFailed = true;
            set({ user: null, isAuthenticated: false, token: null, isLoading: false, activeTenantId: null, activeTenantName: null, loginUserType: null });
          } finally {
            _fetchPromise = null;
          }
        };

        _fetchPromise = doFetch();
        return _fetchPromise;
      },

      // ─── Refresh automático de tokens ─────────────────────────────────
      refreshAuth: async () => {
        try {
          const refreshToken = typeof window !== 'undefined' 
            ? localStorage.getItem('xlayout-refresh-token') 
            : null;
          
          if (!refreshToken) return false;

          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
          const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!res.ok) return false;

          const data = await res.json();
          
          // Actualizar tokens
          set({ token: data.access_token, isAuthenticated: true });
          if (data.refresh_token) {
            localStorage.setItem('xlayout-refresh-token', data.refresh_token);
          }

          _fetchFailed = false;
          return true;
        } catch {
          return false;
        }
      },

      updatePreferences: async (prefs: any) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const newPrefs = { ...currentUser.preferences, ...prefs };
        set({ user: { ...currentUser, preferences: newPrefs } });
        
        try {
          await api.post('/auth/preferences', newPrefs);
        } catch (err) {
          console.error("Error al guardar preferencias", err);
          set({ user: currentUser });
        }
      },

      setActiveTenantId: (id: string) => {
        const user = get().user;
        const tenant = user?.tenants.find(t => t.tenantId === id);
        if (tenant) {
          set({ activeTenantId: id, activeTenantName: tenant.tenantName });
        }
      },

      getActiveTenant: () => {
        const { user, activeTenantId } = get();
        if (!user || !activeTenantId) return null;
        return user.tenants.find(t => t.tenantId === activeTenantId) || null;
      },

      getUserType: () => {
        const { user, loginUserType } = get();
        return user?.userType || loginUserType || null;
      },

      getDistributorRole: () => {
        const { user } = get();
        return user?.distributorRole || null;
      },

      isDistributorUser: () => {
        const { user } = get();
        return user?.userType === 'DISTRIBUTOR_USER';
      },

      isPlatformUser: () => {
        const { user } = get();
        return user?.userType === 'PLATFORM_USER';
      },

      isCompanyUser: () => {
        const { user } = get();
        return user?.userType === 'COMPANY_USER';
      },

      logout: () => {
        // Invalidar refresh token en el servidor
        const refreshToken = typeof window !== 'undefined' 
          ? localStorage.getItem('xlayout-refresh-token') 
          : null;
        
        if (refreshToken) {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
          fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {}); // Fire and forget
          
          localStorage.removeItem('xlayout-refresh-token');
        }

        _fetchFailed = false;
        _fetchPromise = null;
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false,
          activeTenantId: null,
          activeTenantName: null,
          loginUserType: null,
        });
      },
    }),
    {
      name: 'xlayout-auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        activeTenantId: state.activeTenantId,
        activeTenantName: state.activeTenantName,
        loginUserType: state.loginUserType,
      }),
    }
  )
);
