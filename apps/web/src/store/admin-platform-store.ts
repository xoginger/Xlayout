/**
 * Creado y diseñado por XO
 */

"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';
  logoUrl?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products?: number;
    companyUsers?: number;
    distributorAccesses?: number;
  };
  productLines?: { id: string; name: string; slug: string; active: boolean }[];
}

export interface Distributor {
  id: string;
  name: string;
  slug: string;
  contactEmail?: string;
  phone?: string;
  country?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users?: number;
    manufacturerAccesses?: number;
  };
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalPlatformUsers: number;
  totalCompanyUsers: number;
  totalDistributorUsers: number;
  totalEndUsers: number;
  suspendedUsers: number;
  totalProducts: number;
  totalDistributors: number;
  activeDistributors: number;
  pendingDistributors: number;
  assets3d: {
    total: number;
    converted: number;
    failed: number;
    pending: number;
  };
  activationCodes: {
    total: number;
    active: number;
  };
  totalAccesses: number;
  imports: {
    total: number;
    failed: number;
  };
}

export interface Asset3D {
  id: string;
  tenantId: string;
  productId?: string | null;
  assetType: string;
  originalFormat?: string;
  conversionStatus: string;
  conversionError?: string;
  metadata?: any;
  createdAt: string;
  product?: { name: string; sku: string };
  tenant?: { name: string; slug: string };
}

export interface AccessRelation {
  id: string;
  tenantId: string;
  distributorId: string;
  active: boolean;
  grantedAt: string;
  expiresAt?: string;
  notes?: string;
  tenant?: { id: string; name: string; slug: string };
  distributor?: { id: string; name: string; slug: string; status: string };
  catalogAccess?: {
    priceListType: string;
    active: boolean;
  };
}

export interface AuditEntry {
  id: string;
  actorType: string;
  actorId: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: any;
  createdAt: string;
}

export interface PlatformConfig {
  platformName: string;
  version: string;
  environment: string;
  buildDate: string;
  features: Record<string, boolean>;
}

export interface PlatformHealth {
  status: string;
  services: Record<string, string>;
  timestamp: string;
}

// ── Estado ─────────────────────────────────────────────────────────────────

interface PlatformState {
  // Datos
  metrics: PlatformMetrics | null;
  tenants: Tenant[];
  distributors: Distributor[];
  assets3d: Asset3D[];
  accesses: AccessRelation[];
  auditLogs: AuditEntry[];
  config: PlatformConfig | null;
  health: PlatformHealth | null;
  allUsers: any[];

  // Estado de carga granular
  isLoading: boolean;
  loadingSection: string | null;
  error: string | null;

  // ── Acciones de lectura ──
  fetchMetrics: () => Promise<void>;
  fetchTenants: () => Promise<void>;
  fetchDistributors: () => Promise<void>;
  fetchAssets3d: (filters?: { status?: string; tenantId?: string }) => Promise<void>;
  fetchAccesses: () => Promise<void>;
  fetchAuditLogs: (filters?: Record<string, string>) => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchAllUsers: () => Promise<void>;

  // ── Acciones de escritura sobre tenants ──
  createTenant: (data: any) => Promise<Tenant>;
  suspendTenant: (id: string) => Promise<void>;
  activateTenant: (id: string) => Promise<void>;
  updateTenantStatus: (id: string, status: string) => Promise<void>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<Tenant>;
  deleteTenant: (id: string) => Promise<void>;

  // ── Acciones de usuarios de tenant ──
  tenantUsers: any[];
  fetchTenantUsers: (tenantId: string) => Promise<void>;
  createTenantUser: (data: any) => Promise<any>;
  updateTenantUserStatus: (id: string, status: string) => Promise<void>;
  updateTenantUserRole: (id: string, role: string) => Promise<void>;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const usePlatformStore = create<PlatformState>((set, get) => ({
  metrics: null,
  tenants: [],
  distributors: [],
  assets3d: [],
  accesses: [],
  auditLogs: [],
  config: null,
  health: null,
  allUsers: [],
  tenantUsers: [],
  isLoading: false,
  loadingSection: null,
  error: null,

  // ── Métricas globales ──
  fetchMetrics: async () => {
    try {
      const metrics = await api.get<PlatformMetrics>('/platform/info/metrics');
      set({ metrics });
    } catch (err: any) {
      console.error('Error cargando métricas:', err);
    }
  },

  // ── Tenants (Marcas) ──
  fetchTenants: async () => {
    set({ isLoading: true, loadingSection: 'tenants', error: null });
    try {
      const tenants = await api.get<Tenant[]>('/tenants');
      set({ tenants, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  createTenant: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTenant = await api.post<Tenant>('/tenants', data);
      set((state) => ({
        tenants: [newTenant, ...state.tenants],
        isLoading: false,
      }));
      return newTenant;
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  suspendTenant: async (id: string) => {
    await api.patch(`/tenants/${id}/status`, { status: 'SUSPENDED' });
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.id === id ? { ...t, status: 'SUSPENDED' as const } : t,
      ),
    }));
  },

  activateTenant: async (id: string) => {
    await api.patch(`/tenants/${id}/status`, { status: 'ACTIVE' });
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.id === id ? { ...t, status: 'ACTIVE' as const } : t,
      ),
    }));
  },

  updateTenantStatus: async (id: string, status: string) => {
    await api.patch(`/tenants/${id}/status`, { status });
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.id === id ? { ...t, status: status as Tenant['status'] } : t,
      ),
    }));
  },

  updateTenant: async (id: string, data: Partial<Tenant>) => {
    set({ isLoading: true });
    try {
      const updated = await api.patch<Tenant>(`/tenants/${id}`, data);
      set((state) => ({
        tenants: state.tenants.map((t) => (t.id === id ? updated : t)),
        isLoading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteTenant: async (id: string) => {
    set({ isLoading: true });
    try {
      await api.delete(`/tenants/${id}`);
      set((state) => ({
        tenants: state.tenants.map((t) =>
          t.id === id ? { ...t, status: 'INACTIVE' as const } : t,
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── Distribuidores ──
  fetchDistributors: async () => {
    set({ isLoading: true, loadingSection: 'distributors', error: null });
    try {
      const distributors = await api.get<Distributor[]>('/distributors');
      set({ distributors, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  // ── Assets 3D ──
  fetchAssets3d: async (filters: { status?: string; tenantId?: string } | undefined) => {
    set({ isLoading: true, loadingSection: 'assets3d', error: null });
    try {
      const params: Record<string, string> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.tenantId) params.tenantId = filters.tenantId;
      const assets3d = await api.get<Asset3D[]>('/platform/info/assets3d', params);
      set({ assets3d, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  // ── Accesos ──
  fetchAccesses: async () => {
    set({ isLoading: true, loadingSection: 'accesses', error: null });
    try {
      const accesses = await api.get<AccessRelation[]>('/platform/info/accesses');
      set({ accesses, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  // ── Auditoría ──
  fetchAuditLogs: async (filters: Record<string, string> | undefined) => {
    set({ isLoading: true, loadingSection: 'audit', error: null });
    try {
      const auditLogs = await api.get<AuditEntry[]>('/audit/platform', filters);
      set({ auditLogs, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  // ── Configuración y salud ──
  fetchConfig: async () => {
    try {
      const config = await api.get<PlatformConfig>('/platform/info/config');
      set({ config });
    } catch (err: any) {
      console.error('Error cargando config:', err);
    }
  },

  fetchHealth: async () => {
    try {
      const health = await api.get<PlatformHealth>('/platform/info/health');
      set({ health });
    } catch (err: any) {
      console.error('Error cargando health:', err);
    }
  },

  // ── Todos los usuarios (multi-tipo) ──
  fetchAllUsers: async () => {
    set({ isLoading: true, loadingSection: 'users', error: null });
    try {
      // Cargar los 3 tipos de usuarios en paralelo
      const [platformUsers, companyUsers, distributorUsers] = await Promise.all([
        api.get<any[]>('/platform-users').catch(() => []),
        // Endpoint no existe aún para listar todos los company users desde plataforma
        // Se deja preparado para cuando el backend lo soporte
        Promise.resolve([]),
        Promise.resolve([]),
      ]);

      const allUsers = [
        ...platformUsers.map((u: any) => ({ ...u, userType: 'PLATFORM_USER' })),
        ...companyUsers.map((u: any) => ({ ...u, userType: 'COMPANY_USER' })),
        ...distributorUsers.map((u: any) => ({ ...u, userType: 'DISTRIBUTOR_USER' })),
      ];

      set({ allUsers, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  fetchTenantUsers: async (tenantId: string) => {
    set({ isLoading: true, loadingSection: 'tenantUsers' });
    try {
      const users = await api.get<any[]>(`/company-users/tenant/${tenantId}`);
      set({ tenantUsers: users, isLoading: false, loadingSection: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, loadingSection: null });
    }
  },

  createTenantUser: async (data: any) => {
    set({ isLoading: true });
    try {
      const newUser = await api.post<any>('/company-users', data);
      set((state) => ({
        tenantUsers: [...state.tenantUsers, newUser],
        isLoading: false
      }));
      return newUser;
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateTenantUserStatus: async (id: string, status: string) => {
    await api.patch(`/company-users/${id}/status`, { status });
    set((state) => ({
      tenantUsers: state.tenantUsers.map((u) => u.id === id ? { ...u, status } : u)
    }));
  },

  updateTenantUserRole: async (id: string, role: string) => {
    await api.patch(`/company-users/${id}/role`, { role });
    set((state) => ({
      tenantUsers: state.tenantUsers.map((u) => u.id === id ? { ...u, role } : u)
    }));
  },
}));
