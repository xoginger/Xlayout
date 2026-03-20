"use client";

import React from 'react';
import { AppShell } from '@/components/nav/AppShell';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { LeftToolbar } from '@/components/editor/LeftToolbar';
import { CatalogPanel } from '@/components/editor/CatalogPanel';
import { Viewport } from '@/components/editor/Viewport';
import { RightInspector } from '@/components/editor/RightInspector';
import { BottomStatusBar } from '@/components/editor/BottomStatusBar';
import { useEditorStore } from '@/store/editor-store';

/**
 * EditorShell — layout del editor.
 *
 * Árbol de alturas (sin h-screen aquí — AppShell es el dueño):
 *   AppShell (h-screen)
 *   ├── GlobalNavBar (h-14)
 *   └── slot flex-1 min-h-0
 *       └── EditorShell: flex-col flex-1 min-h-0
 *           ├── EditorToolbar (h-12, contextual del editor)
 *           └── área principal flex-1 min-h-0
 *               ├── LeftToolbar
 *               ├── CatalogPanel (animado)
 *               ├── Viewport
 *               └── RightInspector
 *
 * NO usar h-screen aquí. La altura total ya la controla AppShell.
 */
export const EditorShell: React.FC = () => {
  const catalogPanelState    = useEditorStore((s) => s.catalogPanelState);
  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const saveToHistory        = useEditorStore((s) => s.saveToHistory);
  const history              = useEditorStore((s) => s.history);

  React.useEffect(() => {
    if (history.length === 0) saveToHistory();
  }, [history.length, saveToHistory]);

  return (
    <AppShell>
      {/*
        flex-1 min-h-0: ocupa todo el slot disponible del AppShell sin desbordarse.
        flex-col: apila EditorToolbar arriba, área principal abajo.
      */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white text-zinc-800 font-sans selection:bg-blue-500/30">

        {/* Barra contextual del editor: File/Edit · Undo/Redo · Nombre · 2D/3D · Export */}
        <EditorToolbar />

        {/* Área principal: herramientas, catálogo, canvas, inspector */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          <LeftToolbar />

          {/* ── Catalog panel: animado open / collapsed / hidden ── */}
          <div
            className="relative flex shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              width:
                catalogPanelState === 'open'      ? '240px' :
                catalogPanelState === 'collapsed' ? '36px'  : '0px',
              opacity: catalogPanelState === 'hidden' ? 0 : 1,
            }}
          >
            <div
              className="absolute inset-0 transition-opacity duration-200"
              style={{
                opacity: catalogPanelState === 'open' ? 1 : 0,
                pointerEvents: catalogPanelState === 'open' ? 'auto' : 'none',
              }}
            >
              <CatalogPanel />
            </div>

            {catalogPanelState === 'collapsed' && (
              <button
                onClick={() => setCatalogPanelState('open')}
                title="Expandir biblioteca de assets"
                className="w-9 flex flex-col items-center justify-center gap-3 py-4 bg-white border-r border-zinc-200 hover:bg-blue-50 transition-colors group"
              >
                <span className="text-base">📦</span>
                <span
                  className="text-[8px] font-black text-zinc-400 group-hover:text-blue-500 uppercase tracking-widest"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  Assets
                </span>
                <span className="text-zinc-400 group-hover:text-blue-500 text-xs mt-auto mb-2">›</span>
              </button>
            )}

            {catalogPanelState === 'open' && (
              <button
                onClick={() => setCatalogPanelState('collapsed')}
                title="Colapsar biblioteca de assets"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 w-5 h-10 flex items-center justify-center bg-white border border-zinc-200 rounded-full shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all group"
              >
                <span className="text-zinc-400 group-hover:text-blue-500 text-xs">‹</span>
              </button>
            )}
          </div>

          {catalogPanelState === 'hidden' && (
            <button
              onClick={() => setCatalogPanelState('open')}
              title="Abrir biblioteca de assets"
              className="flex items-center justify-center w-6 shrink-0 bg-zinc-50 border-r border-zinc-200 hover:bg-blue-50 transition-colors group"
            >
              <span
                className="text-[7px] font-black text-zinc-400 group-hover:text-blue-500 uppercase tracking-widest"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Assets
              </span>
            </button>
          )}

          <Viewport />
          <RightInspector />
        </div>

        <BottomStatusBar />
      </div>
    </AppShell>
  );
};
