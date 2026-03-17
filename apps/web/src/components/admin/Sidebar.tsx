"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type SidebarType = 'platform' | 'company';

interface SidebarProps {
  type: SidebarType;
}

const NavIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'overview':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
    case 'tenants':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m1 8h1m1-3h1m-5 1h1m-1 4h1m1 0h1m-1-5h1m-1 1h1m-1 4h1m1 0h1"/></svg>;
    case 'catalog':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>;
    case 'users':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
    case 'pricing':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>;
    case 'imports':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>;
    case 'audit':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>;
    case 'editor':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
    default:
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
  }
};

const SidebarItem = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

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

export const Sidebar = ({ type }: SidebarProps) => {
  const base = type === 'platform' ? '/admin/platform' : '/admin/company';
  
  const sections = type === 'platform' 
    ? [
        { label: 'Overview', href: `${base}/overview`, icon: 'overview' },
        { label: 'Tenants', href: `${base}/tenants`, icon: 'tenants' },
        { label: 'Users', href: `${base}/users`, icon: 'users' },
        { label: 'Activity', href: `${base}/activity`, icon: 'audit' },
        { label: 'Config', href: `${base}/config`, icon: 'config' },
      ]
    : [
        { label: 'Dashboard', href: `${base}/dashboard`, icon: 'overview' },
        { label: 'Catalog', href: `${base}/catalog`, icon: 'catalog', subItems: [
          { label: 'Lines', href: `${base}/catalog/lines` },
          { label: 'Products', href: `${base}/catalog/products` },
        ]},
        { label: 'Pricing', href: `${base}/pricing`, icon: 'pricing' },
        { label: 'Access Codes', href: `${base}/access/codes`, icon: 'users' },
        { label: 'Imports', href: `${base}/imports`, icon: 'imports' },
        { label: 'Users', href: `${base}/users`, icon: 'users' },
        { label: 'Audit', href: `${base}/audit`, icon: 'audit' },
      ];

  return (
    <aside className="w-64 admin-sidebar flex flex-col p-4 gap-6">
      <div className="flex items-center gap-2 px-2 pb-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">XL</div>
        <span className="font-bold text-slate-900 tracking-tight">XLayout Admin</span>
      </div>
      
      <nav className="flex-1 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
          {type === 'platform' ? 'Platform Management' : 'Company Workspace'}
        </div>
        {sections.map((item) => (
          <SidebarItem key={item.href} {...item} icon={item.icon || 'default'} />
        ))}
      </nav>

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
          Module: Admin Panel<br/>
          Version: admin-panel-v2-full<br/>
          Build: 2026-03-16
        </div>
      </div>
    </aside>
  );
};
