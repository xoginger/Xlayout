/**
 * Creado y diseñado por XO
 * route-permissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Matriz centralizada de permisos por ruta y helpers de autorización.
 * Fuente de verdad para protección de rutas en frontend.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────

type UserType = 'PLATFORM_USER' | 'COMPANY_USER' | 'DISTRIBUTOR_USER' | 'END_USER';
type DistributorRole = 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';

interface RouteRule {
  /** Prefijo de la ruta a proteger */
  prefix: string;
  /** Tipos de usuario permitidos */
  allowedUserTypes: UserType[];
  /** Roles internos permitidos (si aplica para DISTRIBUTOR_USER) */
  allowedDistributorRoles?: DistributorRole[];
}

// ─── Reglas de ruta (orden importa: más específicas primero) ────────────────

const ROUTE_RULES: RouteRule[] = [
  // Rutas de plataforma — solo PLATFORM_USER
  { prefix: '/admin/platform', allowedUserTypes: ['PLATFORM_USER'] },

  // Rutas de empresa/fabricante — PLATFORM_USER y COMPANY_USER
  { prefix: '/admin/company', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER'] },

  // Rutas de distribuidor — restricciones por sub-rol
  { prefix: '/admin/distributor/markup', allowedUserTypes: ['PLATFORM_USER', 'DISTRIBUTOR_USER'], allowedDistributorRoles: ['DISTRIBUTOR_ADMIN'] },
  { prefix: '/admin/distributor/designers', allowedUserTypes: ['PLATFORM_USER', 'DISTRIBUTOR_USER'], allowedDistributorRoles: ['DISTRIBUTOR_ADMIN'] },
  { prefix: '/admin/distributor', allowedUserTypes: ['PLATFORM_USER', 'DISTRIBUTOR_USER'] },

  // Editor — todos menos END_USER
  { prefix: '/editor', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },

  // Proyectos — todos menos END_USER
  { prefix: '/projects', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },

  // Catálogo público — todos los autenticados (el filtrado de datos lo hace el backend)
  { prefix: '/catalog', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },

  // Registro de distribuidor — ruta pública (no requiere auth)
  { prefix: '/register', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER', 'END_USER'] },
];

/** Rutas que no requieren autenticación */
const PUBLIC_ROUTES = ['/', '/login', '/register/distributor'];

// ─── Funciones públicas ─────────────────────────────────────────────────────

/**
 * Determina si una ruta es pública (no requiere autenticación).
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/'),
  );
}

/**
 * Verifica si un usuario puede acceder a una ruta específica.
 * Retorna true si tiene acceso, false si no.
 */
export function canAccessRoute(
  userType: string | undefined,
  distributorRole: string | undefined,
  pathname: string,
): boolean {
  // Rutas públicas: siempre accesibles
  if (isPublicRoute(pathname)) return true;

  // Sin tipo de usuario: sin acceso a rutas protegidas
  if (!userType) return false;

  // Buscar la regla más específica que coincida (primera que haga match)
  const rule = ROUTE_RULES.find(r => pathname.startsWith(r.prefix));

  // Sin regla: permitir acceso (ruta no protegida explícitamente)
  if (!rule) return true;

  // Verificar tipo de usuario
  if (!rule.allowedUserTypes.includes(userType as UserType)) {
    return false;
  }

  // Si hay restricción de rol de distribuidor y el usuario es DISTRIBUTOR_USER
  if (
    rule.allowedDistributorRoles &&
    userType === 'DISTRIBUTOR_USER'
  ) {
    if (!distributorRole || !rule.allowedDistributorRoles.includes(distributorRole as DistributorRole)) {
      return false;
    }
  }

  return true;
}

/**
 * Retorna la ruta de redirección post-login según el userType.
 */
export function getPostLoginRedirect(userType: string | undefined): string {
  switch (userType) {
    case 'PLATFORM_USER':
      return '/admin/platform/overview';
    case 'COMPANY_USER':
      return '/admin/company/dashboard';
    case 'DISTRIBUTOR_USER':
      return '/admin/distributor/dashboard';
    case 'END_USER':
      return '/editor';
    default:
      return '/login';
  }
}

/**
 * Retorna la ruta de fallback cuando un usuario intenta acceder a una ruta no permitida.
 */
export function getFallbackRoute(userType: string | undefined): string {
  return getPostLoginRedirect(userType);
}
