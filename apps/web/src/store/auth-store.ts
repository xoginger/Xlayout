/**
 * Creado y diseñado por XO
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
  // Lista de precios asignada al distribuidor para este fabricante (A/B/C/D/E)
  priceListType?: string;
  access: {
    pricesEnabled: boolean;
    conditionsEnabled: boolean;
  };
}

// Regla de markup del distribuidor — recibida desde el backend al autenticarse
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
  // Campos específicos del usuario distribuidor
  distributorId?: string;
  distributorName?: string;
  distributorRole?: 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';
  // Campos específicos del usuario de empresa
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
  // userType persistido del login para redirección pre-fetch
  loginUserType: UserType | null;
  
  setAuth: (token: string, userData: any) => void;
  fetchMe: () => Promise<void>;
  updatePreferences: (prefs: any) => Promise<void>;
  setActiveTenantId: (id: string) => void;
  getActiveTenant: () => TenantContext | null;
  // Helpers de tipo y rol
  getUserType: () => UserType | null;
  getDistributorRole: () => string | null;
  isDistributorUser: () => boolean;
  isPlatformUser: () => boolean;
  isCompanyUser: () => boolean;
  logout: () => void;
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

      setAuth: (token, userData) => set({ 
        token, 
        isAuthenticated: true,
        // Guardar userType del login para redirección inmediata
        loginUserType: userData?.userType || null,
      }),

      fetchMe: async () => {
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

          set({ 
            user: me, 
            isLoading: false, 
            isAuthenticated: true,
            loginUserType: me.userType || null,
            activeTenantId: activeTenant?.tenantId || null,
            activeTenantName: activeTenant?.tenantName || null
          });
        } catch (err) {
          set({ user: null, isAuthenticated: false, token: null, isLoading: false, activeTenantId: null, activeTenantName: null, loginUserType: null });
        }
      },

      updatePreferences: async (prefs: any) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const newPrefs = { ...currentUser.preferences, ...prefs };
        
        // Actualización optimista en el store
        set({ user: { ...currentUser, preferences: newPrefs } });
        
        try {
          await api.post('/auth/preferences', newPrefs);
        } catch (err) {
          console.error("Error al guardar preferencias", err);
          // Revertir si falla
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

      // ─── Helpers de tipo y rol ─────────────────────────────────────────

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

      logout: () => set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        activeTenantId: null,
        activeTenantName: null,
        loginUserType: null,
      }),
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
