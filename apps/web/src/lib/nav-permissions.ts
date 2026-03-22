/**
 * Creado y diseñado por XO
 * nav-permissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FUENTE ÚNICA DE VERDAD para la navegación global de XLayout.
 *
 * ¿Por qué centralizar aquí?
 * - Un solo lugar donde agregar/quitar módulos
 * - Lógica de roles completamente separada de los componentes de UI
 * - Fácil de extender a multi-tenant o feature flags en el futuro
 */

export type UserRole = 'platform_admin' | 'company_admin' | 'end_user';

export interface NavModule {
  /** Identificador único del módulo */
  id: string;
  /** Etiqueta visible en la barra */
  label: string;
  /** Ruta de destino al hacer clic */
  href: string;
  /**
   * Prefijos de pathname que hacen que este módulo quede "activo".
   * Usa startsWith() — nunca igualdad exacta.
   */
  matchPrefixes: string[];
}

/**
 * Configuración completa de módulos por rol.
 * El orden de la lista determina el orden visual en la barra.
 */
const MODULE_DEFINITIONS: Record<UserRole, NavModule[]> = {
  platform_admin: [
    {
      id: 'editor',
      label: 'Editor',
      href: '/editor',
      matchPrefixes: ['/editor'],
    },
    {
      id: 'projects',
      label: 'Proyectos',
      href: '/projects',
      matchPrefixes: ['/projects'],
    },
    {
      id: 'catalog',
      label: 'Catálogo',
      href: '/admin/company/catalog/products',
      matchPrefixes: ['/admin/company/catalog'],
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin/company/dashboard',
      matchPrefixes: ['/admin/company/dashboard'],
    },
    {
      id: 'admin',
      label: 'Admin',
      href: '/admin/platform/overview',
      // Platform admin accede a /admin/platform/* Y /admin/company/*
      matchPrefixes: ['/admin/platform', '/admin/company'],
    },
  ],

  company_admin: [
    {
      id: 'editor',
      label: 'Editor',
      href: '/editor',
      matchPrefixes: ['/editor'],
    },
    {
      id: 'projects',
      label: 'Proyectos',
      href: '/projects',
      matchPrefixes: ['/projects'],
    },
    {
      id: 'catalog',
      label: 'Catálogo',
      href: '/admin/company/catalog/products',
      matchPrefixes: ['/admin/company/catalog'],
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin/company/dashboard',
      matchPrefixes: ['/admin/company/dashboard'],
    },
    {
      id: 'admin',
      label: 'Admin',
      href: '/admin/company/dashboard',
      // Company admin SOLO accede a /admin/company
      matchPrefixes: ['/admin/company'],
    },
  ],

  end_user: [
    {
      id: 'editor',
      label: 'Editor',
      href: '/editor',
      matchPrefixes: ['/editor'],
    },
    {
      id: 'projects',
      label: 'Proyectos',
      href: '/projects',
      matchPrefixes: ['/projects'],
    },
    {
      id: 'catalog',
      label: 'Catálogo',
      href: '/admin/company/catalog/products',
      matchPrefixes: ['/admin/company/catalog'],
    },
    // end_user: NO tiene Dashboard ni Admin
  ],
};

/**
 * Retorna los módulos de navegación para un rol dado.
 * Devuelve lista vacía si el rol es desconocido (safe default).
 */
export function getNavModulesForRole(role: string | undefined): NavModule[] {
  if (!role) return [];
  return MODULE_DEFINITIONS[role as UserRole] ?? [];
}

/**
 * Determina si un módulo está activo basándose en el pathname actual.
 * Usa startsWith() — NUNCA igualdad exacta.
 */
export function isModuleActive(module: NavModule, pathname: string): boolean {
  return module.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Helpers de conveniencia para verificar roles
 */
export const RoleGuards = {
  canAccessAdmin: (role: string | undefined): boolean =>
    role === 'platform_admin' || role === 'company_admin',

  canAccessDashboard: (role: string | undefined): boolean =>
    role === 'platform_admin' || role === 'company_admin',

  isPlatformAdmin: (role: string | undefined): boolean =>
    role === 'platform_admin',

  isCompanyAdmin: (role: string | undefined): boolean =>
    role === 'company_admin',
} as const;
