"use client";

import React from 'react';
import { useEditorStore } from '@/store/editor-store';

export const BottomStatusBar: React.FC = () => {
  const { activeTool, selectedId, selectedType, gridSize, snapEnabled } = useEditorStore();

  return (
    <footer className="h-7 w-full flex items-center justify-between border-t border-zinc-200 bg-white px-4 shrink-0 shadow-sm z-50">
      <div className="flex items-center gap-6 h-full">
        <div className="flex items-center gap-2 px-2 h-full border-r border-zinc-200 group cursor-help transition-all hover:bg-zinc-50">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse"></span>
          <span className="text-[9px] font-black tracking-widest text-zinc-500 group-hover:text-zinc-900 transition-colors uppercase">RT-CORE: STABLE</span>
        </div>
        
        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-500 h-full">
           <div className="flex items-center gap-2">
              <span className="text-zinc-400">TOOL:</span>
              <span className="text-blue-600">{activeTool?.toUpperCase()}</span>
           </div>
           {selectedId && (
             <div className="flex items-center gap-2 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 shadow-sm">
                <span className="text-zinc-500">SELECTED:</span>
                <span className="text-emerald-600">{selectedType?.toUpperCase()}</span>
                <span className="text-[8px] text-zinc-400 font-mono ring-1 ring-zinc-200 px-1 ml-1">{selectedId.substr(0,8)}</span>
             </div>
           )}
        </div>
      </div>
      
      <div className="flex items-center gap-6 h-full text-[9px] font-black uppercase tracking-widest text-zinc-500">
        <VersionIndicator />

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 hover:text-zinc-900 transition-all cursor-pointer">
              <span className="text-zinc-400">GRID:</span>
              <span>{gridSize.toFixed(2)}m</span>
           </div>
           <div className="flex items-center gap-1 hover:text-zinc-900 transition-all cursor-pointer">
              <span className="text-zinc-400">SNAP:</span>
              <span className={snapEnabled ? 'text-blue-600' : 'text-red-500'}>{snapEnabled ? 'ON' : 'OFF'}</span>
           </div>
        </div>

        <div className="h-3 w-px bg-zinc-200" />

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1">
              <span className="text-zinc-400">UNITS:</span>
              <span className="text-zinc-800">METRIC (m)</span>
           </div>
           <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-50 rounded ring-1 ring-blue-500/20 text-blue-600 text-[8px] transition-all hover:bg-blue-100">
              <span className="font-mono">SCALE 1:1</span>
           </div>
        </div>
      </div>
    </footer>
  );
};

const VersionIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded shadow-sm border bg-zinc-50 border-zinc-200">
      <span className="text-zinc-500">Module: <span className="text-blue-600 font-black">Catalog Integration</span></span>
      <span className="text-zinc-300 mx-1">|</span>
      <span className="text-zinc-500">Version: <span className="font-black text-blue-700">catalog-live-v1</span></span>
      <span className="text-zinc-300 mx-1">|</span>
      <span className="text-zinc-400">Build: <span className="text-zinc-600">2026-03-16</span></span>
    </div>
  );
};
