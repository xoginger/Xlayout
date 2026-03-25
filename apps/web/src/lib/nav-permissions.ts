/**
 * Creado y diseñado por XO
 * nav-permissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FUENTE ÚNICA DE VERDAD para la navegación global de XLayout.
 *
 * Define 6 perfiles de navegación según userType + rol interno.
 * Cada perfil define los módulos visibles y sus rutas.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────

/** Perfiles de navegación del sistema */
export type NavProfile =
  | 'platform'
  | 'company'
  | 'distributor_admin'
  | 'designer'
  | 'sales'
  | 'end_user';

/** Tipos de usuario del sistema */
export type UserType = 'PLATFORM_USER' | 'COMPANY_USER' | 'DISTRIBUTOR_USER' | 'END_USER';

/** Roles internos de distribuidor */
export type DistributorRole = 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';

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

// ─── Módulos reutilizables ──────────────────────────────────────────────────

const MOD_EDITOR: NavModule = {
  id: 'editor',
  label: 'Editor',
  href: '/editor',
  matchPrefixes: ['/editor'],
};

const MOD_PROJECTS: NavModule = {
  id: 'projects',
  label: 'Proyectos',
  href: '/projects',
  matchPrefixes: ['/projects'],
};

const MOD_CATALOG: NavModule = {
  id: 'catalog',
  label: 'Catálogo',
  href: '/admin/company/catalog/products',
  matchPrefixes: ['/admin/company/catalog', '/catalog'],
};

const MOD_BRANDS: NavModule = {
  id: 'brands',
  label: 'Marcas',
  href: '/admin/company/dashboard',
  matchPrefixes: ['/admin/company'],
};

const MOD_DASHBOARD: NavModule = {
  id: 'dashboard',
  label: 'Dashboard',
  href: '/admin/platform/overview',
  matchPrefixes: ['/admin/platform/overview'],
};

const MOD_ADMIN: NavModule = {
  id: 'admin',
  label: 'Admin',
  href: '/admin/platform/overview',
  matchPrefixes: ['/admin/platform'],
};

const MOD_DIST_DASHBOARD: NavModule = {
  id: 'dist_dashboard',
  label: 'Dashboard',
  href: '/admin/distributor/dashboard',
  matchPrefixes: ['/admin/distributor/dashboard'],
};

const MOD_DIST_CATALOGS: NavModule = {
  id: 'dist_catalogs',
  label: 'Catálogos',
  href: '/admin/distributor/catalogs',
  matchPrefixes: ['/admin/distributor/catalogs'],
};

const MOD_DIST_MARKUP: NavModule = {
  id: 'dist_markup',
  label: 'Markup',
  href: '/admin/distributor/markup',
  matchPrefixes: ['/admin/distributor/markup'],
};

const MOD_DIST_DESIGNERS: NavModule = {
  id: 'dist_designers',
  label: 'Diseñadores',
  href: '/admin/distributor/designers',
  matchPrefixes: ['/admin/distributor/designers'],
};

// ─── Perfiles de navegación ─────────────────────────────────────────────────

const NAV_PROFILES: Record<NavProfile, NavModule[]> = {
  // PLATFORM_USER — acceso total
  platform: [
    MOD_EDITOR,
    MOD_PROJECTS,
    MOD_CATALOG,
    MOD_BRANDS,
    MOD_DASHBOARD,
    MOD_ADMIN,
  ],

  // COMPANY_USER — administración de su marca
  company: [
    MOD_EDITOR,
    MOD_PROJECTS,
    MOD_CATALOG,
    MOD_BRANDS,
  ],

  // DISTRIBUTOR_USER con rol DISTRIBUTOR_ADMIN
  distributor_admin: [
    MOD_EDITOR,
    MOD_PROJECTS,
    MOD_DIST_CATALOGS,
    MOD_DIST_DASHBOARD,
    MOD_DIST_DESIGNERS,
    MOD_DIST_MARKUP,
  ],

  // DISTRIBUTOR_USER con rol DESIGNER
  designer: [
    MOD_EDITOR,
    MOD_PROJECTS,
    MOD_DIST_CATALOGS,
  ],

  // DISTRIBUTOR_USER con rol SALES
  sales: [
    MOD_PROJECTS,
    MOD_DIST_CATALOGS,
  ],

  // END_USER — sin navegación administrativa
  end_user: [],
};

// ─── Funciones públicas ─────────────────────────────────────────────────────

/**
 * Resuelve el perfil de navegación basándose en userType y rol interno.
 */
export function resolveNavProfile(
  userType?: string,
  distributorRole?: string,
): NavProfile {
  if (!userType) return 'end_user';

  switch (userType) {
    case 'PLATFORM_USER':
      return 'platform';
    case 'COMPANY_USER':
      return 'company';
    case 'DISTRIBUTOR_USER':
      switch (distributorRole) {
        case 'DISTRIBUTOR_ADMIN':
          return 'distributor_admin';
        case 'DESIGNER':
          return 'designer';
        case 'SALES':
          return 'sales';
        default:
          return 'designer'; // fallback seguro para rol desconocido
      }
    case 'END_USER':
    default:
      return 'end_user';
  }
}

/**
 * Retorna los módulos de navegación para un perfil dado.
 */
export function getNavModulesForProfile(profile: NavProfile): NavModule[] {
  return NAV_PROFILES[profile] ?? [];
}

/**
 * Retorna los módulos de navegación resolviendo userType + rol.
 * Uso directo desde componentes.
 */
export function getNavModules(
  userType?: string,
  distributorRole?: string,
): NavModule[] {
  const profile = resolveNavProfile(userType, distributorRole);
  return getNavModulesForProfile(profile);
}

/**
 * Compatibilidad con API anterior — mapea role legacy a userType.
 * @deprecated Usar getNavModules(userType, distributorRole) en su lugar.
 */
export function getNavModulesForRole(role: string | undefined): NavModule[] {
  if (!role) return [];
  switch (role) {
    case 'platform_admin':
      return getNavModulesForProfile('platform');
    case 'company_admin':
      return getNavModulesForProfile('company');
    case 'distributor_user':
      return getNavModulesForProfile('designer'); // fallback seguro
    case 'end_user':
      return getNavModulesForProfile('end_user');
    default:
      return [];
  }
}

/**
 * Determina si un módulo está activo basándose en el pathname actual.
 */
export function isModuleActive(module: NavModule, pathname: string): boolean {
  return module.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Helpers para verificar permisos por sección
 */
export const SectionGuards = {
  /** ¿Puede acceder al editor? */
  canAccessEditor: (profile: NavProfile): boolean =>
    ['platform', 'company', 'distributor_admin', 'designer'].includes(profile),

  /** ¿Puede acceder a proyectos? */
  canAccessProjects: (profile: NavProfile): boolean =>
    profile !== 'end_user',

  /** ¿Puede acceder a catálogo? */
  canAccessCatalog: (profile: NavProfile): boolean =>
    profile !== 'end_user',

  /** ¿Puede acceder a la sección Marcas (admin de fabricante)? */
  canAccessBrands: (profile: NavProfile): boolean =>
    ['platform', 'company'].includes(profile),

  /** ¿Puede acceder al dashboard global? */
  canAccessDashboard: (profile: NavProfile): boolean =>
    profile === 'platform',

  /** ¿Puede acceder al panel Admin global? */
  canAccessAdmin: (profile: NavProfile): boolean =>
    profile === 'platform',

  /** ¿Puede administrar markup? */
  canManageMarkup: (profile: NavProfile): boolean =>
    ['platform', 'distributor_admin'].includes(profile),

  /** ¿Puede administrar diseñadores del distribuidor? */
  canManageDesigners: (profile: NavProfile): boolean =>
    ['platform', 'distributor_admin'].includes(profile),

  /** ¿Es usuario de plataforma? */
  isPlatform: (profile: NavProfile): boolean =>
    profile === 'platform',

  /** ¿Es usuario de empresa/fabricante? */
  isCompany: (profile: NavProfile): boolean =>
    profile === 'company',
} as const;
