/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminButton } from './AdminButton';

interface AdminModalProps {
  /** Indica si el modal está visible */
  isOpen: boolean;
  /** Función para cerrar el modal */
  onClose: () => void;
  /** Título del modal */
  title: string;
  /** Contenido principal */
  children: React.ReactNode;
  /** Botones o elementos de acción en el pie */
  footer?: React.ReactNode;
  /** Ancho máximo del modal (clase de Tailwind) */
  width?: string;
}

/**
 * Componente de Modal Administrativo con Portal para evitar problemas de stacking context.
 * Renderiza el contenido sobre una capa z-index superior a los drawers.
 */
export const AdminModal = ({ isOpen, onClose, title, children, footer, width = 'max-w-lg' }: AdminModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} overflow-hidden animate-in zoom-in-95 duration-200 shadow-slate-900/20`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
