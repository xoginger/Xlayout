/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';

interface AlertCardProps {
  /** Severidad de la alerta */
  severity: 'error' | 'warning' | 'info';
  /** Título de la alerta */
  title: string;
  /** Valor numérico prominente */
  count: number;
  /** Descripción corta */
  description?: string;
  /** Acción al hacer clic */
  onClick?: () => void;
  /** Etiqueta del botón de acción */
  actionLabel?: string;
}

// Tarjeta de alerta/evento crítico para la vista general
export const AlertCard = ({
  severity,
  title,
  count,
  description,
  onClick,
  actionLabel,
}: AlertCardProps) => {
  const styles = {
    error: {
      bg: 'bg-rose-50 border-rose-200 hover:border-rose-300',
      icon: 'text-rose-500',
      badge: 'bg-rose-100 text-rose-700',
      action: 'text-rose-600 hover:text-rose-700',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 hover:border-amber-300',
      icon: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-700',
      action: 'text-amber-600 hover:text-amber-700',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 hover:border-blue-300',
      icon: 'text-blue-500',
      badge: 'bg-blue-100 text-blue-700',
      action: 'text-blue-600 hover:text-blue-700',
    },
  };

  const s = styles[severity];

  const icons = {
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all cursor-pointer ${s.bg}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${s.icon}`}>{icons[severity]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{title}</span>
            {count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>
                {count}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
          {onClick && actionLabel && (
            <button className={`text-xs font-medium mt-2 ${s.action}`}>
              {actionLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
