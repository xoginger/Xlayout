"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

// Placeholder de proyecto card
const ProjectCard = ({ name, date, items }: { name: string; date: string; items: number }) => (
  <div className="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-md">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{date}</span>
    </div>
    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide mb-1.5">{name}</h3>
    <p className="text-[11px] text-slate-500">{items} objetos en el layout</p>
  </div>
);

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  // Datos de ejemplo — en el futuro se reemplazará con datos reales de API
  const sampleProjects = [
    { name: 'Oficina corporativa CDMX', date: 'Mar 19, 2026', items: 24 },
    { name: 'Sala de juntas Monterrey', date: 'Mar 17, 2026', items: 12 },
    { name: 'Lobby Polanco', date: 'Mar 15, 2026', items: 8 },
    { name: 'Comedor industrial GDL', date: 'Mar 10, 2026', items: 31 },
  ];

  return (
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8 w-full h-full">
        <div className="max-w-6xl mx-auto">
          {/* Header de sección */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Proyectos</h1>
              <p className="text-sm text-slate-500 mt-1">Todos tus layouts guardados en XLayout</p>
            </div>
            <button
              onClick={() => router.push('/editor')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
                <path d="M5 12h14M12 5v14"/>
              </svg>
              Nuevo proyecto
            </button>
          </div>

          {/* Grid de proyectos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
            {sampleProjects.map((p) => (
              <ProjectCard key={p.name} {...p} />
            ))}
          </div>

          {/* Módulo en construcción */}
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-blue-500">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-slate-600 mb-1">Módulo de Proyectos</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              La gestión completa de proyectos estará disponible próximamente. Por ahora, guarda y abre proyectos desde el Editor.
            </p>
            <button
              onClick={() => router.push('/editor')}
              className="mt-5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Ir al Editor
            </button>
          </div>
        </div>
      </div>
  );
}
