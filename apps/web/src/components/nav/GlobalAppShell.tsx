/**
 * Creado y diseñado por XO
 * GlobalAppShell
 * ─────────────────────────────────────────────────────────────────────────────
 * Shell wrapper que provee RouteGuard + GlobalHeader para rutas protegidas.
 * Se usa desde los layouts de /site y /studio para rutas que requieren auth.
 */

"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const GlobalHeader = dynamic<{ pathname: string }>(
  () => import('@/components/nav/GlobalHeader').then((mod) => mod.GlobalHeader),
  { ssr: false }
);

const RouteGuard = dynamic<{ children: React.ReactNode }>(
  () => import('@/components/auth/RouteGuard').then((mod) => ({ default: mod.RouteGuard })),
  { ssr: false }
);

interface GlobalAppShellProps {
  children: React.ReactNode;
}

export function GlobalAppShell({ children }: GlobalAppShellProps) {
  const pathname = usePathname() || '';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-white" />;
  }

  return (
    <RouteGuard>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-zinc-800 font-sans selection:bg-blue-500/30">
        <GlobalHeader pathname={pathname} />
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {children}
        </div>
      </div>
    </RouteGuard>
  );
}
