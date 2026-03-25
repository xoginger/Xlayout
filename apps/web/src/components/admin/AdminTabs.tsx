/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useState } from 'react';

interface Tab {
  /** Identificador único del tab */
  id: string;
  /** Etiqueta visible */
  label: string;
  /** Contador opcional */
  count?: number;
  /** Ícono opcional */
  icon?: React.ReactNode;
}

interface AdminTabsProps {
  /** Lista de tabs disponibles */
  tabs: Tab[];
  /** Tab activo actualmente */
  activeTab: string;
  /** Callback al cambiar de tab */
  onChange: (tabId: string) => void;
  /** Variante de estilo */
  variant?: 'underline' | 'pills';
}

// Pestañas reutilizables para vistas de detalle
export const AdminTabs = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
}: AdminTabsProps) => {
  if (variant === 'pills') {
    return (
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Variante "underline" por defecto
  return (
    <div className="border-b border-slate-200">
      <nav className="flex gap-0 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};
