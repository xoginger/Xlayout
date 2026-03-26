/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useRef } from 'react';

interface AdminDrawerProps {
  /** Controla si el drawer está abierto */
  isOpen: boolean;
  /** Callback para cerrar */
  onClose: () => void;
  /** Título del drawer */
  title: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Contenido del drawer */
  children: React.ReactNode;
  /** Ancho del drawer */
  width?: 'md' | 'lg' | 'xl';
}

// Panel lateral derecho (drawer) para vista de detalle de entidades
export const AdminDrawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'lg',
}: AdminDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div
        ref={drawerRef}
        className={`relative ${widths[width]} w-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200`}
      >
        {/* Cabecera */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
