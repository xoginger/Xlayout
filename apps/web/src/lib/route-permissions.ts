/**
 * Creado y diseñado por XO
 * route-permissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Matriz centralizada de permisos por ruta y helpers de autorización.
 * Soporta las rutas /site/* y /studio/* del middleware de dominio,
 * así como las rutas públicas del usuario.
 */

type UserType = 'PLATFORM_USER' | 'COMPANY_USER' | 'DISTRIBUTOR_USER' | 'END_USER';
type DistributorRole = 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';

interface RouteRule {
  prefix: string;
  allowedUserTypes: UserType[];
  allowedDistributorRoles?: DistributorRole[];
}

// ─── Reglas de ruta (las rutas pueden venir con o sin prefijo /site /studio) ──

const ROUTE_RULES: RouteRule[] = [
  // Rutas de plataforma
  { prefix: '/admin/platform', allowedUserTypes: ['PLATFORM_USER'] },
  // Rutas de empresa/fabricante
  { prefix: '/admin/company', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER'] },
  // Rutas de distribuidor
  { prefix: '/admin/distributor/markup', allowedUserTypes: ['PLATFORM_USER', 'DISTRIBUTOR_USER'], allowedDistributorRoles: ['DISTRIBUTOR_ADMIN'] },
  { prefix: '/admin/distributor/designers', allowedUserTypes: ['PLATFORM_USER', 'DISTRIBUTOR_USER'], allowedDistributorRoles: ['DISTRIBUTOR_ADMIN'] },
  { prefix: '/admin/distributor', allowedUserTypes: ['PLATFORM_USER', 'DISTRIBUTOR_USER'] },
  // Editor y workspace
  { prefix: '/editor', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },
  { prefix: '/workspace', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },
  // Proyectos
  { prefix: '/projects', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },
  // Catálogo
  { prefix: '/catalog', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER'] },
  // Registro
  { prefix: '/register', allowedUserTypes: ['PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER', 'END_USER'] },
];

/** Rutas que no requieren autenticación */
const PUBLIC_ROUTES = ['/', '/login', '/register/distributor', '/auth/callback', '/pricing', '/contacto', '/soporte'];

/**
 * Normaliza un pathname quitando los prefijos /site y /studio
 * para que las reglas de permisos funcionen uniformemente.
 */
function normalizePath(pathname: string): string {
  if (pathname.startsWith('/site')) {
    return pathname.slice(5) || '/';
  }
  if (pathname.startsWith('/studio')) {
    return pathname.slice(7) || '/';
  }
  return pathname;
}

export function isPublicRoute(pathname: string): boolean {
  const norm = normalizePath(pathname);
  return PUBLIC_ROUTES.some(route =>
    norm === route || norm.startsWith(route + '/'),
  );
}

export function canAccessRoute(
  userType: string | undefined,
  distributorRole: string | undefined,
  pathname: string,
): boolean {
  const norm = normalizePath(pathname);

  if (isPublicRoute(pathname)) return true;
  if (!userType) return false;

  const rule = ROUTE_RULES.find(r => norm.startsWith(r.prefix));
  if (!rule) return true;

  if (!rule.allowedUserTypes.includes(userType as UserType)) {
    return false;
  }

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

export function getFallbackRoute(userType: string | undefined): string {
  return getPostLoginRedirect(userType);
}
