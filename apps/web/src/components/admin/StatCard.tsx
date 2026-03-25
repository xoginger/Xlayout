/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';

interface StatCardProps {
  /** Etiqueta de la métrica */
  label: string;
  /** Valor numérico o texto */
  value: string | number;
  /** Tendencia opcional */
  trend?: { type: 'up' | 'down'; value: string };
  /** Ícono opcional */
  icon?: React.ReactNode;
  /** Variante de color para el fondo del ícono */
  color?: 'default' | 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  /** Callback opcional al hacer clic */
  onClick?: () => void;
}

// Tarjeta de métrica KPI con variantes de color
export const StatCard = ({ label, value, trend, icon, color = 'default', onClick }: StatCardProps) => {
  const iconBgs: Record<string, string> = {
    default: 'bg-slate-50 text-slate-400',
    blue: 'bg-blue-50 text-blue-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    amber: 'bg-amber-50 text-amber-500',
    rose: 'bg-rose-50 text-rose-500',
    indigo: 'bg-indigo-50 text-indigo-500',
  };

  return (
    <div
      className={`admin-card p-6 flex items-start justify-between transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''}`}
      onClick={onClick}
    >
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h4 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{value}</h4>
        {trend && (
          <p className={`text-xs mt-2 flex items-center gap-1 ${trend.type === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span>{trend.type === 'up' ? '↑' : '↓'}</span>
            <span className="font-semibold">{trend.value}</span>
            <span className="text-slate-400 font-normal">vs mes anterior</span>
          </p>
        )}
      </div>
      {icon && (
        <div className={`p-2.5 rounded-xl ${iconBgs[color]}`}>
          {icon}
        </div>
      )}
    </div>
  );
};
