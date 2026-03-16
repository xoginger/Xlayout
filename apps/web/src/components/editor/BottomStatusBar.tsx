"use client";

import React from 'react';
import { useEditorStore } from '@/store/editor-store';

export const BottomStatusBar: React.FC = () => {
  const { activeTool, selectedId, selectedType, gridSize, snapEnabled } = useEditorStore();

  return (
    <footer className="h-7 w-full flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 shrink-0 shadow-2xl z-50 ring-1 ring-white/5">
      <div className="flex items-center gap-6 h-full">
        <div className="flex items-center gap-2 px-2 h-full border-r border-zinc-800/50 group cursor-help transition-all hover:bg-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse"></span>
          <span className="text-[9px] font-black tracking-widest text-zinc-400 group-hover:text-zinc-100 transition-colors uppercase">RT-CORE: STABLE</span>
        </div>
        
        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-500 h-full">
           <div className="flex items-center gap-2">
              <span className="text-zinc-600">TOOL:</span>
              <span className="text-blue-500">{activeTool?.toUpperCase()}</span>
           </div>
           {selectedId && (
             <div className="flex items-center gap-2 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 shadow-inner">
                <span className="text-zinc-600">SELECTED:</span>
                <span className="text-emerald-500">{selectedType?.toUpperCase()}</span>
                <span className="text-[8px] text-zinc-700 font-mono ring-1 ring-zinc-800/50 px-1 ml-1">{selectedId.substr(0,8)}</span>
             </div>
           )}
        </div>
      </div>
      
      <div className="flex items-center gap-6 h-full text-[9px] font-black uppercase tracking-widest text-zinc-500">
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950/50 border border-zinc-800/40 rounded shadow-inner">
            <span className="text-zinc-600">Tool: <span className="text-blue-500">{activeTool?.toUpperCase()}</span></span>
            <span className="text-zinc-800 mx-1">|</span>
            <span className="text-zinc-400">Version: <span className="text-emerald-400 font-black">floor-align-v1</span></span>
            <span className="text-zinc-800 mx-1">|</span>
            <span className="text-zinc-400">Build: <span className="text-zinc-300">2026-03-16</span></span>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 hover:text-zinc-200 transition-all cursor-pointer">
              <span className="text-zinc-600">GRID:</span>
              <span>{gridSize.toFixed(2)}m</span>
           </div>
           <div className="flex items-center gap-1 hover:text-zinc-200 transition-all cursor-pointer">
              <span className="text-zinc-600">SNAP:</span>
              <span className={snapEnabled ? 'text-blue-500' : 'text-red-500'}>{snapEnabled ? 'ON' : 'OFF'}</span>
           </div>
        </div>

        <div className="h-3 w-px bg-zinc-800" />

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1">
              <span className="text-zinc-600">UNITS:</span>
              <span className="text-zinc-300">METRIC (m)</span>
           </div>
           <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-600/10 rounded ring-1 ring-blue-500/20 text-blue-400 text-[8px] transition-all hover:bg-blue-600/20">
              <span className="font-mono">SCALE 1:1</span>
           </div>
        </div>
      </div>
    </footer>
  );
};
