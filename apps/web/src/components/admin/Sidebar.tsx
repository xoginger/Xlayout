/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Tipos de sidebar: platform (Xocotzin), company (fabricante), distributor (distribuidor)
export type SidebarType = 'platform' | 'company' | 'distributor';

interface SidebarProps {
  type: SidebarType;
}

// Iconos para la navegación lateral
const NavIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'overview':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>;
    case 'brands':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m1 8h1m1-3h1m-5 1h1m-1 4h1m1 0h1m-1-5h1m-1 1h1m-1 4h1m1 0h1"/></svg>;
    case 'tenants':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m1 8h1m1-3h1m-5 1h1m-1 4h1m1 0h1m-1-5h1m-1 1h1m-1 4h1m1 0h1"/></svg>;
    case 'catalog':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>;
    case 'users':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
    case 'access':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>;
    case 'pricing':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>;
    case 'imports':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>;
    case 'audit':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>;
    case 'editor':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
    case 'distributors':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>;
    case 'markup':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M17 17h.01M7 17L17 7"/></svg>;
    case 'variants':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>;
    case 'assets3d':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
    case 'config':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
    default:
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
  }
};

// Ítem de navegación individual con estado activo
const SidebarItem = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <NavIcon name={icon} />
      <span className="text-sm">{label}</span>
    </Link>
  );
};

// Separador de sección en el sidebar
const SidebarDivider = ({ label }: { label: string }) => (
  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mt-4 mb-2">
    {label}
  </div>
);

// Configuración de secciones por tipo de sidebar
const getSections = (type: SidebarType) => {
  if (type === 'platform') {
    const base = '/admin/platform';
    return {
      main: [
        { label: 'Vista General', href: `${base}/overview`, icon: 'overview' },
      ],
      entities: [
        { label: 'Marcas', href: `${base}/tenants`, icon: 'brands' },
        { label: 'Distribuidores', href: `${base}/distributors`, icon: 'distributors' },
        { label: 'Usuarios', href: `${base}/users`, icon: 'users' },
        { label: 'Accesos', href: `${base}/access`, icon: 'access' },
      ],
      operations: [
        { label: 'Assets 3D', href: `${base}/assets3d`, icon: 'assets3d' },
        { label: 'Actividad', href: `${base}/activity`, icon: 'audit' },
        { label: 'Configuración', href: `${base}/config`, icon: 'config' },
      ],
    };
  }

  if (type === 'distributor') {
    const base = '/admin/distributor';
    return {
      main: [
        { label: 'Tablero', href: `${base}/dashboard`, icon: 'overview' },
        { label: 'Catálogos', href: `${base}/catalogs`, icon: 'catalog' },
        { label: 'Markup de Precios', href: `${base}/markup`, icon: 'markup' },
        { label: 'Diseñadores', href: `${base}/designers`, icon: 'users' },
      ],
    };
  }

  // company (fabricante)
  const base = '/admin/company';
  return {
    main: [
      { label: 'Tablero', href: `${base}/dashboard`, icon: 'overview' },
    ],
    catalog: [
      { label: 'Productos', href: `${base}/catalog/products`, icon: 'catalog' },
      { label: 'Líneas', href: `${base}/catalog/lines`, icon: 'variants' },
      { label: 'Variantes', href: `${base}/catalog/variants`, icon: 'variants' },
      { label: 'Assets 3D', href: `${base}/catalog/assets`, icon: 'assets3d' },
      { label: 'Precios', href: `${base}/pricing`, icon: 'pricing' },
    ],
    commercial: [
      { label: 'Distribuidores', href: `${base}/distributors`, icon: 'distributors' },
      { label: 'Códigos de Acceso', href: `${base}/access/codes`, icon: 'access' },
      { label: 'Importaciones', href: `${base}/imports`, icon: 'imports' },
    ],
    system: [
      { label: 'Usuarios', href: `${base}/users`, icon: 'users' },
      { label: 'Auditoría', href: `${base}/audit`, icon: 'audit' },
    ],
  };
};

// Título según tipo de panel
const getPanelTitle = (type: SidebarType) => {
  if (type === 'platform') return 'Centro de Control';
  if (type === 'distributor') return 'Panel de Distribuidor';
  return 'Espacio de Empresa';
};

export const Sidebar = ({ type }: SidebarProps) => {
  const sections = getSections(type);

  return (
    <aside className="w-64 admin-sidebar flex flex-col p-4 gap-2">
      {/* Cabecera del sidebar */}
      <div className="flex items-center gap-2 px-2 pb-4 border-b border-slate-200">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
          type === 'distributor' ? 'bg-emerald-600' : type === 'platform' ? 'bg-indigo-600' : 'bg-blue-600'
        }`}>XL</div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight block text-sm leading-tight">
            {type === 'distributor' ? 'XLayout Dist.' : 'XLayout Admin'}
          </span>
          <span className="text-[10px] text-slate-400 leading-none">
            {getPanelTitle(type)}
          </span>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {/* Secciones principales */}
        {'main' in sections && sections.main.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}

        {/* Sección de entidades (solo platform) */}
        {'entities' in sections && (
          <>
            <SidebarDivider label="Entidades" />
            {(sections as any).entities.map((item: any) => (
              <SidebarItem key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Sección de operaciones (solo platform) */}
        {'operations' in sections && (
          <>
            <SidebarDivider label="Operaciones" />
            {(sections as any).operations.map((item: any) => (
              <SidebarItem key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Sección de catálogo (solo company) */}
        {'catalog' in sections && (
          <>
            <SidebarDivider label="Catálogo" />
            {(sections as any).catalog.map((item: any) => (
              <SidebarItem key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Sección comercial (solo company) */}
        {'commercial' in sections && (
          <>
            <SidebarDivider label="Comercial" />
            {(sections as any).commercial.map((item: any) => (
              <SidebarItem key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Sección de sistema (solo company) */}
        {'system' in sections && (
          <>
            <SidebarDivider label="Sistema" />
            {(sections as any).system.map((item: any) => (
              <SidebarItem key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Footer del sidebar */}
      <div className="mt-auto pt-4 border-t border-slate-200 flex flex-col gap-3">
        <Link
          href="/editor"
          className="flex items-center gap-3 px-4 py-3 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors font-medium text-sm shadow-sm group"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <span>Abrir Editor</span>
          <svg className="w-3.5 h-3.5 ml-auto opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </Link>
        <div className="px-4 py-2 text-[10px] text-slate-400 font-mono">
          Módulo: {getPanelTitle(type)}<br/>
          Versión: admin-panel-v4<br/>
          Build: 2026-03-25
        </div>
      </div>
    </aside>
  );
};
