import React from 'react';
import { useEditorStore } from '@/store/editor-store';

const NavMenuItem: React.FC<{ label: string }> = ({ label }) => (
  <button className="px-2 py-1 rounded hover:bg-zinc-800 hover:text-white transition-all text-[11px] font-medium border border-transparent hover:border-zinc-700">
    {label}
  </button>
);

export const TopBar: React.FC = () => {
  const { 
    items, walls, activeTool, viewMode, setViewMode, 
    undo, redo, historyIndex, history, saveToHistory 
  } = useEditorStore();

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 shrink-0 shadow-2xl z-50 ring-1 ring-white/5">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 pr-4 border-r border-zinc-800">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm ring-2 ring-blue-400/30 shadow-lg shadow-blue-900/40">X</div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tighter text-zinc-100 text-xs">XLAYOUT</span>
            <span className="text-zinc-500 font-bold text-[8px] tracking-[0.3em] mt-0.5">ENGINE</span>
          </div>
        </div>
        
        <nav className="hidden items-center gap-1 md:flex text-zinc-400">
          <NavMenuItem label="File" />
          <NavMenuItem label="Edit" />
          <NavMenuItem label="View" />
          <NavMenuItem label="Tools" />
          <NavMenuItem label="Help" />
        </nav>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="flex bg-zinc-950 rounded-xl p-1 border border-zinc-800 shadow-inner ring-1 ring-white/5 mx-4 max-w-xs w-full justify-between items-center px-4">
           <button 
             onClick={undo} 
             disabled={historyIndex <= 0} 
             className="text-zinc-600 hover:text-zinc-100 disabled:opacity-20 transition-all font-bold text-xs"
           >UNDO</button>
           <div className="flex items-center gap-2 px-6 py-1 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
             <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[120px]">NEW PROJECT ALPHA</span>
           </div>
           <button 
             onClick={redo} 
             disabled={historyIndex >= history.length - 1} 
             className="text-zinc-600 hover:text-zinc-100 disabled:opacity-20 transition-all font-bold text-xs"
           >REDO</button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 shadow-inner overflow-hidden">
          <button 
            onClick={() => setViewMode('2D')}
            className={`px-4 py-1.5 rounded-md text-[9px] font-black tracking-[0.2em] transition-all uppercase ${viewMode === '2D' ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400/30' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            2D BLUEPRINT
          </button>
          <button 
            onClick={() => setViewMode('3D')}
            className={`px-4 py-1.5 rounded-md text-[9px] font-black tracking-[0.2em] transition-all uppercase ${viewMode === '3D' ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400/30' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            3D PROJECT
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-800" />

        <button className="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95 border border-emerald-400/30 ring-1 ring-emerald-500/20">
          EXPORT QUOTE
        </button>
      </div>
    </header>
  );
};
