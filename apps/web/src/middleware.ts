/**
 * Creado y diseñado por XO
 * XLayout — Next.js Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Enruta requests según el dominio del Host header:
 *   - xlayout.mx      → /site/*  (landing, login, admin)
 *   - xlayout.studio  → /studio/* (editor, workspace)
 *
 * Rutas de studio accedidas desde xlayout.mx se redirigen a xlayout.studio.
 * Rutas de site accedidas desde xlayout.studio se redirigen a xlayout.mx.
 */

import { NextRequest, NextResponse } from 'next/server';

// Dominios configurados
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'xlayout.mx';
const STUDIO_DOMAIN = process.env.NEXT_PUBLIC_STUDIO_DOMAIN || 'xlayout.studio';

// Rutas que no deben reescribirse (assets, API, internals)
const BYPASS_PREFIXES = ['/_next', '/api', '/favicon.ico', '/static', '/storage'];

// Rutas que pertenecen a studio (editor/workspace)
const STUDIO_PATHS = ['/editor', '/workspace', '/projects'];

// Rutas que pertenecen a site (admin, landing, login, etc.)
const SITE_PATHS = ['/admin', '/login', '/register', '/pricing', '/contacto', '/soporte'];

function isSiteDomain(hostname: string): boolean {
  return (
    hostname === SITE_DOMAIN ||
    hostname.endsWith(`.${SITE_DOMAIN}`) ||
    hostname === '217.77.3.204'
  );
}

function isStudioDomain(hostname: string): boolean {
  return (
    hostname === STUDIO_DOMAIN ||
    hostname.endsWith(`.${STUDIO_DOMAIN}`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No reescribir assets estáticos ni rutas internas
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Si ya está en /site/ o /studio/ (rutas internas), no reescribir
  if (pathname.startsWith('/site') || pathname.startsWith('/studio')) {
    return NextResponse.next();
  }

  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // ─── Resolución del protocolo ──────────────────────────────────────────────
  const proto = request.headers.get('x-forwarded-proto') || 'http';

  // ─── Cross-domain redirects ────────────────────────────────────────────────
  // Si el usuario está en xlayout.mx pero accede a una ruta de studio → redirect
  if (isSiteDomain(hostname)) {
    const isStudioPath = STUDIO_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (isStudioPath) {
      return NextResponse.redirect(
        new URL(`${proto}://${STUDIO_DOMAIN}${pathname}${request.nextUrl.search}`),
      );
    }
  }

  // Si el usuario está en xlayout.studio pero accede a una ruta de site → redirect
  if (isStudioDomain(hostname)) {
    const isSitePath = SITE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (isSitePath) {
      return NextResponse.redirect(
        new URL(`${proto}://${SITE_DOMAIN}${pathname}${request.nextUrl.search}`),
      );
    }
  }

  // ─── Determinar el prefijo interno ─────────────────────────────────────────

  let targetPrefix: string;

  if (isStudioDomain(hostname)) {
    targetPrefix = '/studio';
  } else if (isSiteDomain(hostname)) {
    targetPrefix = '/site';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Desarrollo local: path-based routing
    const domainOverride = request.headers.get('x-xlayout-domain');
    if (domainOverride === 'studio') {
      targetPrefix = '/studio';
    } else {
      // En localhost, rutas de studio van a /studio, el resto a /site
      const isStudioPath = STUDIO_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
      targetPrefix = isStudioPath ? '/studio' : '/site';
    }
  } else {
    targetPrefix = '/site';
  }

  // ─── Rewrite ───────────────────────────────────────────────────────────────

  const url = request.nextUrl.clone();
  url.pathname = `${targetPrefix}${pathname === '/' ? '' : pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
