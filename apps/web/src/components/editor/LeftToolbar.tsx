import React from 'react';
import { useEditorStore, ToolType } from '@/store/editor-store';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  tool: ToolType;
  shortcut?: string;
  description?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, tool, shortcut, description }) => {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const active = activeTool === tool;

  return (
    <button 
      onClick={() => setActiveTool(tool)}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all group relative
        ${active ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-500/50' : 'hover:bg-zinc-100 text-zinc-600'}`}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {icon}
      </div>
      <div className="absolute left-full ml-3 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-all border border-zinc-800 shadow-2xl flex flex-col gap-1 min-w-[120px]">
        <div className="flex justify-between items-center gap-4">
          <span className="font-black uppercase tracking-widest text-blue-400">{label}</span>
          <span className="text-zinc-500 font-mono">[{shortcut}]</span>
        </div>
        {description && <p className="text-[9px] text-zinc-400 normal-case font-medium leading-tight whitespace-normal">{description}</p>}
      </div>
    </button>
  );
};

const Icons = {
  Select: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
  ),
  Line: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19 19 5"/></svg>
  ),
  Rectangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
  ),
  Wall: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v6"/><path d="M15 9v6"/><path d="M9 15v6"/></svg>
  ),
  PushPull: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/><path d="M12 9v12"/><path d="M5 3h14"/></svg>
  ),
  Move: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>
  ),
  Rotate: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
  ),
  Scale: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3 3 21"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/></svg>
  ),
  Measure: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v4"/><path d="M14 3v4"/><path d="M18 3v4"/><path d="M22 3v4"/><path d="M2 3v18h20"/><path d="M6 3v4"/></svg>
  ),
  Dimension: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3"/><path d="M3 3v6"/><path d="M21 3v6"/><path d="M10 21l-3-3 3-3"/><path d="M14 21l3-3-3-3"/></svg>
  )
};

export const LeftToolbar: React.FC = () => {
  const { selectedId, removeItem } = useEditorStore();

  return (
    <aside className="w-14 flex flex-col items-center py-4 border-r border-zinc-200 bg-white gap-2 shrink-0 z-40 shadow-sm relative">
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Select />} label="Select" tool="select" shortcut="V" description="Select and transform objects in the scene." />
        <ToolButton icon={<Icons.Line />} label="Line" tool="line" shortcut="L" description="Draw connected segments with real-time guides." />
        <ToolButton icon={<Icons.Rectangle />} label="Rectangle" tool="rectangle" shortcut="R" description="Create rectangular surfaces quickly." />
      </div>

      <div className="h-px w-8 bg-zinc-200 mx-auto my-1" />
      
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Wall />} label="Wall" tool="wall" shortcut="W" description="Build structural walls with thickness and height." />
        <ToolButton icon={<Icons.PushPull />} label="Push / Pull" tool="extrude" shortcut="P" description="Extrude closed faces into 3D volumes." />
        <ToolButton icon={<Icons.Dimension />} label="Dimension" tool="dimension" shortcut="D" description="Place linear measurements between points." />
      </div>
      
      <div className="h-px w-8 bg-zinc-200 mx-auto my-1" />
      
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Move />} label="Move" tool="move" shortcut="M" description="Translate objects along the floor grid." />
        <ToolButton icon={<Icons.Rotate />} label="Rotate" tool="rotate" shortcut="Q" description="Rotate objects around their vertical axis." />
        <ToolButton icon={<Icons.Scale />} label="Scale" tool="scale" shortcut="S" description="Resize independent assets and perimeters." />
      </div>
      
      <div className="h-px w-8 bg-zinc-200 mx-auto my-1" />
      
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Measure />} label="Measure" tool="measure" shortcut="T" description="Quick ruler for temporary distance checks." />
      </div>
      
      <button 
        disabled={!selectedId}
        onClick={() => selectedId && removeItem(selectedId)}
        className="w-10 h-10 mt-auto flex items-center justify-center rounded-lg transition-all text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:grayscale ring-red-500/20 hover:ring-1"
        title="Delete (Backspace)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>

      <div className="mt-2 flex flex-col items-center p-2">
        <div className="w-8 h-8 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-[10px] text-zinc-500 font-bold hover:text-zinc-800 hover:bg-zinc-100 cursor-help transition-all">?</div>
      </div>
    </aside>
  );
};
