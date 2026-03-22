"use client";

import React from 'react';
import { Sidebar, SidebarType } from './Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  type: SidebarType;
  title: string;
}

/**
 * Creado y diseñado por XO
 * AdminLayout — layout para páginas de administración.
 *
 * Árbol de alturas (sin h-screen aquí — AppShell es el dueño):
 *   AppShell (h-screen)
 *   ├── GlobalNavBar (h-14) ← ÚNICA barra superior del sistema
 *   └── slot flex-1 min-h-0
 *       └── AdminLayout: flex flex-1 min-h-0
 *           ├── Sidebar (w-64, sidebar lateral)
 *           └── área de contenido flex-col flex-1 min-h-0
 *               ├── sub-header de sección (h-14, solo título)
 *               └── main (flex-1 overflow-y-auto)
 *
 * NO hay <Header /> propio aquí. La navegación global viene de GlobalNavBar
 * a través de AppShell. Doble header = error eliminado.
 */
export const AdminLayout = ({ children, type, title }: AdminLayoutProps) => {
  return (
    <>
      {/* Sidebar lateral del contexto admin */}
      <Sidebar type={type} />

      {/*
        flex-col flex-1 min-h-0: ocupa todo el espacio horizontal restante
        después de la Sidebar, con altura correcta sin desbordarse.
      */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-slate-50">

        {/* Sub-header de sección: solo muestra el título de la página admin actual */}
        <div className="h-14 border-b border-slate-200 bg-white flex items-center px-8 shrink-0">
          <h1 className="text-base font-bold text-slate-800 tracking-tight">{title}</h1>
        </div>

        {/* Contenido principal con scroll vertical */}
        <main className="flex-1 overflow-y-auto p-8 min-h-0">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};
