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
      <div className="absolute left-full ml-3 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-all border border-zinc-800 shadow-2xl flex flex-col gap-1 min-w-[140px]">
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
  Circle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
  ),
  Arc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12A10 10 0 0 0 12 2"/></svg>
  ),
  Freehand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c-1.2 0-2.4.6-3.1 1.5L3.3 12.3c-.4.6-.4 1.4 0 2l1.6 2.5c.3.5.9.8 1.5.8h11.2c.6 0 1.2-.3 1.5-.8l1.6-2.5c.4-.6.4-1.4 0-2L15.1 4.5c-.7-.9-1.9-1.5-3.1-1.5z"/></svg>
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
  Offset: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="5" y="5" rx="2"/><rect width="8" height="8" x="8" y="8" rx="1"/></svg>
  ),
  FollowMe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15"/><path d="M13 18l3 3 3-3"/><path d="M16 8v13"/></svg>
  ),
  Tape: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V3"/><path d="M5 12h14"/><path d="M19 21V3"/><circle cx="12" cy="12" r="1"/></svg>
  ),
  Paint: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 6-7-4-7 4"/><path d="M12 2v10"/><path d="M5 6v12l7 4 7-4V6"/><path d="M12 12 5 8"/><path d="M12 12l7-4"/></svg>
  ),
  Eraser: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21z"/><path d="m22 21-10 0"/></svg>
  ),
  Dimension: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3"/><path d="M3 3v6"/><path d="M21 3v6"/><path d="M10 21l-3-3 3-3"/><path d="M14 21l3-3-3-3"/></svg>
  )
};

export const LeftToolbar: React.FC = () => {
  const { selectedId, removeItem } = useEditorStore();

  return (
    <aside className="w-14 flex flex-col items-center py-4 border-r border-zinc-200 bg-white gap-2 shrink-0 z-40 shadow-sm relative overflow-y-auto no-scrollbar">
      {/* 1. SELECCIÓN */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Select />} label="Seleccionar" tool="select" shortcut="V" description="Selecciona objetos, caras y aristas." />
      </div>

      <div className="h-px w-8 bg-zinc-200 mx-auto my-1" />

      {/* 2. CREACIÓN (2D) */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Line />} label="Línea" tool="line" shortcut="L" description="Dibuja aristas y líneas profesionales." />
        <ToolButton icon={<Icons.Rectangle />} label="Rectángulo" tool="rectangle" shortcut="R" description="Crea superficies rectangulares." />
        <ToolButton icon={<Icons.Circle />} label="Círculo" tool="circle" shortcut="C" description="Dibuja círculos (centro + radio)." />
        <ToolButton icon={<Icons.Arc />} label="Arco" tool="arc" shortcut="A" description="Arcos de 2 puntos con control de curvatura." />
        <ToolButton icon={<Icons.Freehand />} label="Mano Alzada" tool="freehand" shortcut="F" description="Dibuja polilíneas suaves personalizadas." />
        <ToolButton icon={<Icons.Wall />} label="Muro" tool="wall" shortcut="W" description="Construye muros estructurales." />
      </div>

      <div className="h-px w-8 bg-zinc-200 mx-auto my-1" />
      
      {/* 3. MODIFICACIÓN (3D) */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.PushPull />} label="Empujar / Tirar" tool="extrude" shortcut="P" description="Extruye caras para crear volúmenes." />
        <ToolButton icon={<Icons.Move />} label="Mover" tool="move" shortcut="M" description="Traslada objetos (Ctrl para copiar)." />
        <ToolButton icon={<Icons.Rotate />} label="Rotar" tool="rotate" shortcut="Q" description="Rota sobre un punto de pivote." />
        <ToolButton icon={<Icons.Scale />} label="Escala" tool="scale" shortcut="S" description="Redimensiona con manejadores profesionales." />
        <ToolButton icon={<Icons.Offset />} label="Equidistancia" tool="offset" shortcut="O" description="Crea copias paralelas de aristas/caras." />
        <ToolButton icon={<Icons.FollowMe />} label="Sígueme" tool="follow-me" shortcut="X" description="Extruye un perfil a lo largo de una ruta." />
      </div>
      
      <div className="h-px w-8 bg-zinc-200 mx-auto my-1" />
      
      {/* 4. CONSTRUCCIÓN / EDICIÓN */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <ToolButton icon={<Icons.Tape />} label="Flexómetro" tool="tape" shortcut="T" description="Mide distancias y crea guías." />
        <ToolButton icon={<Icons.Dimension />} label="Acotación" tool="dimension" shortcut="D" description="Coloca medidas lineales permanentes." />
        <ToolButton icon={<Icons.Paint />} label="Pintar" tool="paint" shortcut="B" description="Aplica materiales y colores." />
        <ToolButton icon={<Icons.Eraser />} label="Borrador" tool="eraser" shortcut="E" description="Elimina aristas y caras." />
      </div>
      
      {/* 5. BORRADO (FIN DE LISTA) */}
      <button 
        disabled={!selectedId}
        onClick={() => selectedId && removeItem(selectedId)}
        className="w-10 h-10 mt-auto flex items-center justify-center rounded-lg transition-all text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:grayscale ring-red-500/20 hover:ring-1"
        title="Eliminar Selección (Backspace)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>

      <div className="mt-2 flex flex-col items-center p-2">
        <div className="w-8 h-8 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-[10px] text-zinc-500 font-bold hover:text-zinc-800 hover:bg-zinc-100 cursor-help transition-all">?</div>
      </div>
    </aside>
  );
};
