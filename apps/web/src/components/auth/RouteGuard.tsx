/**
 * Creado y diseñado por XO
 * RouteGuard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente wrapper que protege rutas según userType + rol.
 * Redirige a la ruta correcta si el usuario no tiene acceso.
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { canAccessRoute, getFallbackRoute, isPublicRoute } from '@/lib/route-permissions';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, isLoading, fetchMe } = useAuthStore();
  const getUserType = useAuthStore(s => s.getUserType);
  const getDistributorRole = useAuthStore(s => s.getDistributorRole);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Rutas públicas: siempre accesibles
    if (isPublicRoute(pathname)) {
      setAuthorized(true);
      return;
    }

    // Sin token: redirigir a login
    if (!token) {
      setAuthorized(false);
      router.replace('/login');
      return;
    }

    // Si hay token pero no hay usuario cargado, hacer fetch
    if (!user && !isLoading) {
      fetchMe();
      return;
    }

    // Si aún está cargando, esperar
    if (isLoading) {
      return;
    }

    // Usuario cargado: verificar permisos de ruta
    if (user) {
      const userType = getUserType();
      const distRole = getDistributorRole();
      const hasAccess = canAccessRoute(userType || undefined, distRole || undefined, pathname);

      if (hasAccess) {
        setAuthorized(true);
      } else {
        // Redirigir a la ruta de fallback para este tipo de usuario
        const fallback = getFallbackRoute(userType || undefined);
        setAuthorized(false);
        router.replace(fallback);
      }
    }
  }, [pathname, token, user, isLoading]);

  // Mostrar pantalla de carga mientras se verifica acceso
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm animate-pulse">
            X
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Verificando acceso...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
