/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';

export const StatCard = ({ label, value, trend, icon }: { label: string; value: string | number; trend?: { type: 'up' | 'down'; value: string }; icon?: React.ReactNode }) => {
  return (
    <div className="admin-card p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 capitalize">{label}</p>
        <h4 className="text-3xl font-bold text-slate-900 mt-2">{value}</h4>
        {trend && (
          <p className={`text-xs mt-2 flex items-center gap-1 ${trend.type === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span>{trend.type === 'up' ? '↑' : '↓'}</span>
            <span className="font-semibold">{trend.value}</span>
            <span className="text-slate-400 font-normal">vs mes anterior</span>
          </p>
        )}
      </div>
      {icon && (
        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
          {icon}
        </div>
      )}
    </div>
  );
};
