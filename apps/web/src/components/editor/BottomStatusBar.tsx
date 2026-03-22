/**
 * Creado y diseñado por XO
 */

import React from 'react';
import { useEditorStore } from '@/store/editor-store';

export const BottomStatusBar: React.FC = () => {
  const { activeTool, selectedIds, selectedType, gridSize, snapEnabled } = useEditorStore();

  return (
    <footer className="h-8 w-full flex items-center justify-between border-t border-zinc-200 bg-white px-6 shrink-0 z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-8 h-full">
        <div className="flex items-center gap-2 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          <span className="text-[9px] font-black tracking-[0.2em] text-zinc-900 uppercase">Sistema Listo</span>
        </div>
        
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest">
           <div className="flex items-center gap-2">
              <span className="text-zinc-400">Herramienta:</span>
              <span className="text-blue-600">{activeTool?.toUpperCase() || 'ESPERA'}</span>
           </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-200/50">
                 <span className="text-zinc-500">Selección:</span>
                 <span className="text-zinc-900 font-bold">
                   {selectedIds.length > 1 ? `${selectedIds.length} OBJETOS` : selectedType?.toUpperCase()}
                 </span>
                 {selectedIds.length === 1 && (
                   <span className="text-[8px] text-zinc-400 font-mono tracking-tighter ml-1">#{selectedIds[0].substr(0,8)}</span>
                 )}
              </div>
            )}
        </div>
      </div>
      
      <div className="flex items-center gap-8 h-full text-[9px] font-black uppercase tracking-[0.1em]">
        <div className="flex items-center gap-4 border-r border-zinc-100 pr-8">
           <div className="flex items-center gap-2">
              <span className="text-zinc-400 uppercase tracking-widest text-[8px]">Rejilla</span>
              <span className="text-zinc-900 font-mono">{(gridSize * 100).toFixed(0)}cm</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-zinc-400 uppercase tracking-widest text-[8px]">Ajuste</span>
              <span className={snapEnabled ? 'text-emerald-600' : 'text-rose-500'}>{snapEnabled ? 'ACTIVO' : 'DESACTIVADO'}</span>
           </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 text-white px-3 py-1 rounded-md text-[8px] tracking-[0.3em] font-black uppercase">
           XLAYOUT v1.2.0-PRO
        </div>

        <div className="text-[9px] text-zinc-400 opacity-60 font-medium tracking-tight normal-case italic select-none">
          Creado y diseñado por <span className="font-bold underline decoration-zinc-300">XO</span>
        </div>
      </div>
    </footer>
  );
};
