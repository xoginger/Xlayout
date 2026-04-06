/**
 * Creado y diseñado por XO
 * XLayout Studio — Landing
 * ─────────────────────────────────────────────────────────────────────────────
 * Página raíz de xlayout.studio.
 * Si el usuario tiene sesión válida, redirige al workspace.
 * Si no, redirige al login en xlayout.mx.
 */

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { LoadingX } from '@/components/ui/XLayoutBrand';

export default function StudioIndexPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      router.replace('/workspace');
    } else {
      // Sin sesión → al login con redirect de vuelta
      const authDomain = process.env.NEXT_PUBLIC_AUTH_DOMAIN || '';
      const studioOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      
      if (authDomain && authDomain !== studioOrigin) {
        window.location.href = `${authDomain}/login?redirect=${encodeURIComponent(studioOrigin + '/workspace')}`;
      } else {
        router.replace('/login?redirect=/workspace');
      }
    }
  }, [isAuthenticated, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <LoadingX size={48} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
          xlayout studio
        </span>
      </div>
    </div>
  );
}
