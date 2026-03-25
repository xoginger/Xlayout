/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';

interface QuickActionProps {
  /** Etiqueta de la acción */
  label: string;
  /** Descripción corta */
  description?: string;
  /** Ícono de la acción */
  icon: React.ReactNode;
  /** Callback al hacer clic */
  onClick: () => void;
  /** Variante de color */
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

// Botón de acción rápida para la vista general del Admin
export const QuickAction = ({
  label,
  description,
  icon,
  onClick,
  variant = 'default',
}: QuickActionProps) => {
  const variants = {
    default: 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    primary: 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100',
    success: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100',
    warning: 'bg-amber-50 border-amber-200 hover:border-amber-300 hover:bg-amber-100',
  };

  const iconColors = {
    default: 'text-slate-500',
    primary: 'text-blue-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 transition-all text-left group w-full ${variants[variant]}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white shadow-sm ${iconColors[variant]} group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-800 block">{label}</span>
          {description && (
            <span className="text-xs text-slate-500 block mt-0.5">{description}</span>
          )}
        </div>
      </div>
    </button>
  );
};
