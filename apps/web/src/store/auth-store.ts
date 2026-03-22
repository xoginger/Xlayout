"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export type UserType = 'PLATFORM_USER' | 'COMPANY_USER' | 'END_USER';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  access: {
    pricesEnabled: boolean;
    conditionsEnabled: boolean;
  };
}

interface User {
  id: string;
  email: string;
  role: 'platform_admin' | 'company_admin' | 'end_user';
  preferences?: any;
  tenants: TenantContext[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTenantId: string | null;
  activeTenantName: string | null;
  
  setAuth: (token: string, userData: any) => void;
  fetchMe: () => Promise<void>;
  updatePreferences: (prefs: any) => Promise<void>;
  setActiveTenantId: (id: string) => void;
  getActiveTenant: () => TenantContext | null;
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

      setAuth: (token, userData) => set({ 
        token, 
        isAuthenticated: true 
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
            activeTenantId: activeTenant?.tenantId || null,
            activeTenantName: activeTenant?.tenantName || null
          });
        } catch (err) {
          set({ user: null, isAuthenticated: false, token: null, isLoading: false, activeTenantId: null, activeTenantName: null });
        }
      },

      updatePreferences: async (prefs: any) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const newPrefs = { ...currentUser.preferences, ...prefs };
        
        // Optimistic update
        set({ user: { ...currentUser, preferences: newPrefs } });
        
        try {
          await api.post('/auth/preferences', newPrefs);
        } catch (err) {
          console.error("Failed to save preferences", err);
          // Rollback if needed
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

      logout: () => set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        activeTenantId: null,
        activeTenantName: null
      }),
    }),
    {
      name: 'xlayout-auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        activeTenantId: state.activeTenantId,
        activeTenantName: state.activeTenantName
      }),
    }
  )
);
