"use client";

import React from 'react';
import { useEditorStore, ToolType } from '@/store/editor-store';

interface ToolButtonProps {
  icon: string;
  label: string;
  tool: ToolType;
  shortcut?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, tool, shortcut }) => {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const active = activeTool === tool;

  return (
    <button 
      onClick={() => setActiveTool(tool)}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all group relative
        ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400/50' : 'hover:bg-zinc-800 text-zinc-500'}`}
      title={`${label} (${shortcut})`}
    >
      <span className="text-lg leading-none">{icon}</span>
      {!active && (
        <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-all border border-zinc-800 shadow-2xl font-bold tracking-wider uppercase ring-1 ring-white/10">
          {label} <span className="text-zinc-500 ml-1">[{shortcut}]</span>
        </div>
      )}
    </button>
  );
};

export const LeftToolbar: React.FC = () => {
  const { selectedId, removeItem, activeTool } = useEditorStore();

  return (
    <aside className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-2 shrink-0 z-40 shadow-2xl">
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon="👆" label="Select" tool="select" shortcut="V" />
        <ToolButton icon="📏" label="Line" tool="line" shortcut="L" />
        <ToolButton icon="⬜" label="Rectangle" tool="rectangle" shortcut="Shift+R" />
        <ToolButton icon="🖐️" label="Pan" tool="pan" shortcut="H" />
        <ToolButton icon="🔍" label="Zoom" tool="zoom" shortcut="Z" />
      </div>

      <div className="h-px w-8 bg-zinc-800/60 mx-auto my-1" />
      
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon="🧱" label="Wall" tool="wall" shortcut="W" />
        <ToolButton icon="📐" label="Dimension" tool="dimension" shortcut="D" />
        <ToolButton icon="🚪" label="Door" tool="door" shortcut="O" />
        <ToolButton icon="🪟" label="Window" tool="window" shortcut="F" />
      </div>
      
      <div className="h-px w-8 bg-zinc-800/60 mx-auto my-1" />
      
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon="🎯" label="Move" tool="move" shortcut="M" />
        <ToolButton icon="🔄" label="Rotate" tool="rotate" shortcut="R" />
        <ToolButton icon="↔️" label="Scale" tool="scale" shortcut="S" />
      </div>
      
      <div className="h-px w-8 bg-zinc-800/60 mx-auto my-1" />
      
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon="📏" label="Measure" tool="measure" shortcut="L" />
        <ToolButton icon="👯" label="Duplicate" tool="duplicate" shortcut="Alt" />
      </div>
      
      <button 
        disabled={!selectedId}
        onClick={() => selectedId && removeItem(selectedId)}
        className="w-10 h-10 mt-auto flex items-center justify-center rounded-lg transition-all text-zinc-600 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-20 disabled:grayscale ring-red-500/20 hover:ring-1"
        title="Delete (Backspace)"
      >
        <span className="text-lg leading-none">🗑️</span>
      </button>

      <div className="mt-2 flex flex-col items-center p-2">
        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center text-[10px] text-zinc-600 font-bold hover:text-zinc-400 cursor-help transition-colors">?</div>
      </div>
    </aside>
  );
};
