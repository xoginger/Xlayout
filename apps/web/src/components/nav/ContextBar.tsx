"use client";

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * ContextBar — Barra contextual del proyecto o documento.
 * Solo muestra nombre, estado de cambios y referencias del contexto.
 */
export const ContextBar: React.FC = () => {
  const { project, setProjectName } = useEditorStore();
  const [isEditingName, setIsEditingName] = useState(false);

  return (
    <div className="flex h-10 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Indicador de estado */}
        <Tooltip 
          content={
            project.isSaving ? "Guardando proyecto..." : 
            project.isDirty  ? "Cambios sin guardar" : 
            "Proyecto guardado"
          } 
          position="bottom"
        >
          <div className="p-1 cursor-default flex items-center justify-center">
            <div className={`w-2.5 h-2.5 rounded-full transition-all border border-black/10 shadow-sm ${
              project.isSaving ? 'bg-blue-500 animate-ping' :
              project.isDirty  ? 'bg-amber-500'             : 'bg-emerald-500'
            }`} />
          </div>
        </Tooltip>
        
        <div className="h-4 w-px bg-zinc-200" />
        
        {/* Nombre interactivo */}
        {isEditingName ? (
            <input
              autoFocus
              className="text-xs font-black text-zinc-900 outline-none w-56 bg-transparent tracking-[0.15em] uppercase border-b-2 border-dashed border-blue-400 pb-0.5"
              value={project.name || ''}
              placeholder="SIN TÍTULO"
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            />
          ) : (
            <Tooltip content="Renombrar proyecto" position="bottom">
              <span 
                className="text-xs font-black text-zinc-800 tracking-[0.15em] uppercase hover:text-blue-600 transition-colors cursor-text select-none py-1 border-b-2 border-transparent hover:border-blue-200"
                onClick={() => setIsEditingName(true)}
              >
                {project.name || 'SIN TÍTULO'}
              </span>
            </Tooltip>
          )}
      </div>
      
      {/* Información extra del contexto (ej: breadcrumbs o módulo activo) */}
      <div className="flex items-center gap-3 select-none">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-md">
          Modo Editor
        </span>
      </div>
    </div>
  );
};
