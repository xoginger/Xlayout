/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import { LeftToolbar } from '@/components/editor/LeftToolbar';
import { CatalogPanel } from '@/components/editor/CatalogPanel';
import { Viewport } from '@/components/editor/Viewport';
import { RightInspector } from '@/components/editor/RightInspector';
import { BottomStatusBar } from '@/components/editor/BottomStatusBar';
import { useEditorStore } from '@/store/editor-store';
import { CalibrationHUD } from '@/components/editor/CalibrationHUD';

/**
 * EditorShell — layout del editor.
 *
 * Árbol de alturas:
 *   h-screen w-screen (Ocupa exactamente el viewport)
 *   ├── EditorHeader (Unified Figma-style top bar)
 *   └── slot flex-1 min-h-0
 *       ├── LeftToolbar
 *       ├── CatalogPanel (animado)
 *       ├── Viewport (Canvas 3D)
 *       └── RightInspector
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
    <div className="flex flex-col flex-1 min-w-0 min-h-0 w-full h-full">
      {/* ── Área principal: herramientas, catálogo, canvas, inspector ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <LeftToolbar />

        {/* ── Catalog Panel (Flotante UI) ── */}
        <CatalogPanel />

        {/* ── Viewport 3D Canvas ── */}
        <div className="flex flex-1 flex-col relative bg-zinc-100 min-w-0">
          <Viewport />
          <CalibrationHUD />
        </div>
        
        <RightInspector />
      </div>

      <BottomStatusBar />
    </div>
  );
};
