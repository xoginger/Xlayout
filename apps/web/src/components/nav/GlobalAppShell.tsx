"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const GlobalHeader = dynamic<{ pathname: string }>(
  () => import('@/components/nav/GlobalHeader').then((mod) => mod.GlobalHeader),
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

  // Rutas que no llevan el navegador persistente (públicas o de aterrizaje)
  const isPublicRoute = pathname === '/' || pathname.startsWith('/login');

  if (!mounted) {
    return <div className="min-h-screen w-full bg-white" />; // Evitar flashes
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-zinc-800 font-sans selection:bg-blue-500/30">
      <GlobalHeader pathname={pathname} />
      {/* El main container cede toda el area a su chilren */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
