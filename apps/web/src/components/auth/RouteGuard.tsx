/**
 * Creado y diseñado por XO
 * RouteGuard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Protege rutas según userType + rol. En xlayout.studio, redirige al login
 * de xlayout.mx con redirect de vuelta. En xlayout.mx, redirige local.
 */

"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, getAuthDomain } from '@/store/auth-store';
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
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (isPublicRoute(pathname)) {
      setAuthorized(true);
      return;
    }

    if (!token) {
      setAuthorized(false);
      hasFetchedRef.current = false;
      
      // Determinar si estamos en studio dominio → redirect cross-domain
      const authDomain = getAuthDomain();
      if (typeof window !== 'undefined' && authDomain && authDomain !== window.location.origin) {
        window.location.href = `${authDomain}/login?redirect=${encodeURIComponent(window.location.href)}`;
      } else {
        router.replace('/login');
      }
      return;
    }

    if (!user && !isLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchMe();
      return;
    }

    if (isLoading) {
      return;
    }

    if (user) {
      const userType = getUserType();
      const distRole = getDistributorRole();
      const hasAccess = canAccessRoute(userType || undefined, distRole || undefined, pathname);

      if (hasAccess) {
        setAuthorized(true);
      } else {
        const fallback = getFallbackRoute(userType || undefined);
        setAuthorized(false);
        router.replace(fallback);
      }
    }
  }, [pathname, token, user, isLoading]);

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
