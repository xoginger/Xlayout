/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import { TopBar } from '@/components/nav/TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell — layout envolvente SOLO para rutas autenticadas.
 * Landing (/) y login (/login) tienen su propio layout público, NO usan AppShell.
 *
 * Estructura de alturas:
 *   h-screen           → AppShell ocupa exactamente el viewport
 *   ├── TopBar         → h-14 shrink-0
 *   └── children slot  → flex-1 min-h-0 overflow-hidden
 *
 * El min-h-0 en el slot evita que los hijos rompan el layout flex
 * cuando su contenido interno crece (comportamiento correcto en flex colums).
 */
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar />
      {/* min-h-0 es crítico: sin él, un hijo flex con overflow-hidden
          puede ignorar el límite de su contenedor en algunos navegadores */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
