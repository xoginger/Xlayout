/**
 * Creado y diseñado por XO
 * XLayout — Site Layout (xlayout.mx)
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout institucional para el sitio principal: landing, login, admin panels.
 * Incluye el GlobalAppShell para rutas protegidas.
 */

"use client";

import { usePathname } from 'next/navigation';
import { GlobalAppShell } from "@/components/nav/GlobalAppShell";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  
  // Determinar si es ruta pública (landing, login, register)
  // Estas rutas no necesitan el RouteGuard ni el header global
  const isPublicRoute = pathname === '/' || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/register');
  
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Rutas protegidas (admin, dashboard) obtienen la shell completa
  return <GlobalAppShell>{children}</GlobalAppShell>;
}
