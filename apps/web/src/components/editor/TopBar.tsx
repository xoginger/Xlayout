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
    <header className="flex h-12 w-full items-center justify-between border-b border-zinc-200 bg-white px-4 shrink-0 shadow-sm z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 pr-4 border-r border-zinc-200">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">X</div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tighter text-zinc-800 text-xs">XLAYOUT</span>
            <span className="text-zinc-400 font-bold text-[8px] tracking-[0.3em] mt-0.5">STUDIO</span>
          </div>
        </div>
        
        <nav className="hidden items-center gap-1 md:flex text-zinc-600">
          <NavMenuItem label="File" />
          <NavMenuItem label="Edit" />
          <NavMenuItem label="View" />
          <NavMenuItem label="Tools" />
          <NavMenuItem label="Help" />
        </nav>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="flex bg-zinc-50 rounded-xl p-1 border border-zinc-200 shadow-sm mx-4 max-w-xs w-full justify-between items-center px-4">
           <button 
             onClick={undo} 
             disabled={historyIndex <= 0} 
             className="text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition-all font-bold text-xs"
           >UNDO</button>
           <div className="flex items-center gap-2 px-6 py-1 bg-white rounded-lg border border-zinc-200 shadow-sm">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
             <span className="text-[10px] font-bold text-zinc-700 truncate max-w-[120px]">INTERIOR LAYOUT</span>
           </div>
           <button 
             onClick={redo} 
             disabled={historyIndex >= history.length - 1} 
             className="text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition-all font-bold text-xs"
           >REDO</button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-zinc-50 rounded-lg p-0.5 border border-zinc-200 shadow-inner overflow-hidden">
          <button 
            onClick={() => setViewMode('2D')}
            className={`px-4 py-1.5 rounded-md text-[9px] font-black tracking-[0.2em] transition-all uppercase ${viewMode === '2D' ? 'bg-white text-blue-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}
          >
            2D PLAN
          </button>
          <button 
            onClick={() => setViewMode('3D')}
            className={`px-4 py-1.5 rounded-md text-[9px] font-black tracking-[0.2em] transition-all uppercase ${viewMode === '3D' ? 'bg-white text-blue-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}
          >
            3D VIEW
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-200" />

        <button className="px-5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold tracking-widest transition-all shadow-md active:scale-95">
          EXPORT QUOTE
        </button>
      </div>
    </header>
  );
};
