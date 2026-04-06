/**
 * Creado y diseñado por XO
 * XLayout Studio — Auth Callback
 * ─────────────────────────────────────────────────────────────────────────────
 * Página que recibe el código de intercambio (exchange code) desde xlayout.mx
 * y lo canjea por tokens propios para el dominio xlayout.studio.
 *
 * Flujo:
 * 1. xlayout.mx/login → login exitoso → genera exchange_code
 * 2. Redirect a xlayout.studio/auth/callback?code=ABC&redirect=/editor
 * 3. Esta página canjea el código por tokens via POST /api/auth/redeem-code
 * 4. Guarda tokens en localStorage y redirige al destino original
 */

"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const fetchMe = useAuthStore(s => s.fetchMe);
  const [error, setError] = useState<string | null>(null);
  const hasRedeemed = useRef(false);

  useEffect(() => {
    if (hasRedeemed.current) return;
    hasRedeemed.current = true;

    const code = searchParams.get('code');
    const redirect = searchParams.get('redirect') || '/workspace';

    if (!code) {
      setError('Código de intercambio no proporcionado');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/redeem-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Error al canjear código');
        }

        const data = await res.json();
        
        // Guardar tokens en el store (y localStorage via persist)
        setAuth(data.access_token, data.user);
        
        // Guardar refresh token
        if (data.refresh_token && typeof window !== 'undefined') {
          localStorage.setItem('xlayout-refresh-token', data.refresh_token);
        }

        // Hidratar el perfil completo
        await fetchMe();

        // Redirigir al destino original
        router.replace(redirect);
      } catch (err: any) {
        setError(err.message || 'Error durante la autenticación');
      }
    })();
  }, [searchParams, router, setAuth, fetchMe]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-lg">
            !
          </div>
          <p className="text-sm text-red-400 font-mono">{error}</p>
          <a
            href={`${process.env.NEXT_PUBLIC_AUTH_DOMAIN || ''}/login`}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Ir al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg animate-pulse">
          X
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
          Autenticando...
        </span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg animate-pulse">
          X
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
