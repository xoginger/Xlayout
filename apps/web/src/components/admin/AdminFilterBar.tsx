/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  /** Identificador del filtro */
  id: string;
  /** Etiqueta del filtro */
  label: string;
  /** Tipo de control */
  type: 'select' | 'search';
  /** Opciones para select */
  options?: FilterOption[];
  /** Placeholder del input */
  placeholder?: string;
  /** Valor actual */
  value: string;
}

interface AdminFilterBarProps {
  /** Grupos de filtros a mostrar */
  filters: FilterGroup[];
  /** Callback al cambiar un filtro */
  onChange: (filterId: string, value: string) => void;
  /** Callback para limpiar todos los filtros */
  onClear?: () => void;
  /** Si hay filtros activos */
  hasActiveFilters?: boolean;
}

// Barra de filtros reutilizable para tablas y listas
export const AdminFilterBar = ({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: AdminFilterBarProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {filter.label}
          </label>
          {filter.type === 'select' ? (
            <select
              value={filter.value}
              onChange={(e) => onChange(filter.id, e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[120px]"
            >
              <option value="">Todos</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={filter.value}
                onChange={(e) => onChange(filter.id, e.target.value)}
                placeholder={filter.placeholder || 'Buscar...'}
                className="text-sm border border-slate-200 rounded-md pl-8 pr-3 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-48"
              />
            </div>
          )}
        </div>
      ))}

      {hasActiveFilters && onClear && (
        <button
          onClick={onClear}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
};
