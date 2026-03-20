"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  getNavModulesForRole,
  isModuleActive,
  type NavModule,
} from '@/lib/nav-permissions';

// ─── NavTab ─────────────────────────────────────────────────────────────────

const NavTab: React.FC<{ module: NavModule; active: boolean }> = ({ module, active }) => (
  <Link
    href={module.href}
    className={`relative px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-150 ${active
        ? 'text-blue-600 bg-blue-50'
        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
      }`}
  >
    {module.label}
    {active && (
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+5px)] w-4 h-0.5 rounded-full bg-blue-600" />
    )}
  </Link>
);

// ─── User Avatar ─────────────────────────────────────────────────────────────

const UserAvatar: React.FC<{ email: string; role: string }> = ({ email, role }) => {
  const initials = email.slice(0, 2).toUpperCase();
  const roleLabel =
    role === 'platform_admin' ? 'Platform Admin' :
      role === 'company_admin' ? 'Company Admin' : 'Usuario';

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden md:flex flex-col items-end leading-none">
        <span className="text-[11px] font-black text-zinc-800 truncate max-w-[140px]">{email}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 mt-0.5">
          {roleLabel}
        </span>
      </div>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[11px] font-black shadow-md ring-2 ring-blue-500/20 shrink-0">
        {initials}
      </div>
    </div>
  );
};

// ─── GlobalNavBar ─────────────────────────────────────────────────────────────

/**
 * Barra de navegación global del sistema.
 * - Fija como parte de AppShell (no usa position:fixed — el h-screen de AppShell la mantiene visible)
 * - Los módulos visibles se calculan con getNavModulesForRole() desde nav-permissions.ts
 * - El tab activo se determina por prefijo de pathname, no igualdad exacta
 * - Solo se monta en rutas autenticadas (dentro de AppShell)
 */
export const GlobalNavBar: React.FC = () => {
  const { user, activeTenantName, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Fuente única de verdad: permisos de navegación centralizados
  const modules = getNavModulesForRole(user?.role);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 shadow-sm">
      {/* ── Izquierda: Logo ── */}
      <div className="flex items-center gap-3 pr-6 border-r border-zinc-200 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-xl ring-2 ring-blue-500/20">
          X
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-black tracking-tighter text-zinc-900 text-sm italic">XLAYOUT</span>
          <span className="text-zinc-400 font-black text-[9px] tracking-[0.4em] mt-0.5">PRO</span>
        </div>
      </div>

      {/* ── Centro: Módulos de navegación ── */}
      <nav className="flex items-center gap-1 flex-1 px-6" aria-label="Navegación principal">
        {modules.map((mod) => (
          <NavTab
            key={mod.id}
            module={mod}
            active={isModuleActive(mod, pathname)}
          />
        ))}
      </nav>

      {/* ── Derecha: Tenant + Usuario + Logout ── */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Contexto de tenant activo */}
        {activeTenantName && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600 max-w-[120px] truncate">
              {activeTenantName}
            </span>
          </div>
        )}

        {user && <UserAvatar email={user.email} role={user.role} />}

        <div className="h-8 w-px bg-zinc-200" />

        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );
};
