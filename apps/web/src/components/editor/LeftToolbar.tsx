import React, { useMemo } from 'react';
import { useEditorStore, ToolType } from '@/store/editor-store';
import { useAuthStore } from '@/store/auth-store';
import { EDITOR_TOOLS_META, EditorToolConfig } from './tools.config';
import { Tooltip } from '@/components/ui/Tooltip';

const Icons: Record<ToolType | string, React.ReactNode> = {
  select: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>,
  line: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19 19 5"/></svg>,
  rectangle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>,
  circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  arc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12A10 10 0 0 0 12 2"/></svg>,
  freehand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c-1.2 0-2.4.6-3.1 1.5L3.3 12.3c-.4.6-.4 1.4 0 2l1.6 2.5c.3.5.9.8 1.5.8h11.2c.6 0 1.2-.3 1.5-.8l1.6-2.5c.4-.6.4-1.4 0-2L15.1 4.5c-.7-.9-1.9-1.5-3.1-1.5z"/></svg>,
  wall: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v6"/><path d="M15 9v6"/><path d="M9 15v6"/></svg>,
  extrude: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/><path d="M12 9v12"/><path d="M5 3h14"/></svg>,
  move: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>,
  rotate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>,
  scale: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3 3 21"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/></svg>,
  offset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="5" y="5" rx="2"/><rect width="8" height="8" x="8" y="8" rx="1"/></svg>,
  'follow-me': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15"/><path d="M13 18l3 3 3-3"/><path d="M16 8v13"/></svg>,
  tape: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V3"/><path d="M5 12h14"/><path d="M19 21V3"/><circle cx="12" cy="12" r="1"/></svg>,
  paint: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 6-7-4-7 4"/><path d="M12 2v10"/><path d="M5 6v12l7 4 7-4V6"/><path d="M12 12 5 8"/><path d="M12 12l7-4"/></svg>,
  eraser: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21z"/><path d="m22 21-10 0"/></svg>,
  dimension: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3"/><path d="M3 3v6"/><path d="M21 3v6"/><path d="M10 21l-3-3 3-3"/><path d="M14 21l3-3-3-3"/></svg>,
  'scale-blueprint': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3 3 21"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/></svg>,
};

const ToolButton: React.FC<{
  tool: EditorToolConfig;
}> = ({ tool }) => {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const active = activeTool === tool.id;

  const tooltipContent = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;

  return (
    <Tooltip content={tooltipContent} position="right">
      <button 
        onClick={() => setActiveTool(tool.id)}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all group relative
          ${active ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-500/50' : 'hover:bg-zinc-100 text-zinc-600'}`}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {Icons[tool.id]}
        </div>
      </button>
    </Tooltip>
  );
};

export const LeftToolbar: React.FC = () => {
  const { selectedId, removeItem } = useEditorStore();
  const { user } = useAuthStore();

  const toolbarTools = useMemo(() => {
    // Obtain configuration or fallback to defaults
    const customOrder = user?.preferences?.toolbarOrder as string[] | undefined;
    
    // Sort logic
    if (customOrder && Array.isArray(customOrder) && customOrder.length > 0) {
      // Create a map for fast lookup
      const orderMap = new Map(customOrder.map((id, index) => [id, index]));
      
      // Sort tools existing in customOrder first, then append any new tools strictly by defaultOrder
      const ordered = [...EDITOR_TOOLS_META].sort((a, b) => {
        const aIndex = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999 + a.defaultOrder;
        const bIndex = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999 + b.defaultOrder;
        return aIndex - bIndex;
      });
      
      return ordered.filter(t => t.group !== 'system');
    }

    // Default Fallback
    return [...EDITOR_TOOLS_META]
      .filter(t => t.group !== 'system')
      .sort((a, b) => a.defaultOrder - b.defaultOrder);
  }, [user?.preferences?.toolbarOrder]);

  return (
    <aside className="w-14 flex flex-col items-center py-4 border-r border-zinc-200 bg-white gap-2 shrink-0 z-40 shadow-sm relative overflow-y-auto no-scrollbar">
      {toolbarTools.map((tool) => (
        <ToolButton key={tool.id} tool={tool} />
      ))}

      {/* BORRADO (FIN DE LISTA) */}
      <Tooltip 
        content={
          <div className="flex items-center justify-between w-[120px]">
            <span className="font-bold">Eliminar Item</span>
            <span className="text-[#a0a0a0] px-1 bg-white/10 rounded">Del</span>
          </div> as unknown as string
        } 
        position="right"
      >
        <button 
          disabled={!selectedId}
          onClick={() => selectedId && removeItem(selectedId)}
          className="w-10 h-10 mt-auto flex items-center justify-center rounded-lg transition-all text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:grayscale ring-red-500/20 hover:ring-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </Tooltip>
    </aside>
  );
};
