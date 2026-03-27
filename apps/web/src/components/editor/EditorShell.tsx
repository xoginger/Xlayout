/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LeftToolbar } from '@/components/editor/LeftToolbar';
import { CatalogPanel } from '@/components/editor/CatalogPanel';
import { Viewport } from '@/components/editor/Viewport';
import { RightInspector } from '@/components/editor/RightInspector';
import { BottomStatusBar } from '@/components/editor/BottomStatusBar';
import { useEditorStore } from '@/store/editor-store';
import { CalibrationHUD } from '@/components/editor/CalibrationHUD';

// ─── Toast de notificación de guardado ─────────────────────────────────────────
const SaveToast: React.FC<{ visible: boolean; message: string; type: 'success' | 'error' }> = ({ visible, message, type }) => {
  if (!visible) return null;
  return (
    <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-xl shadow-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all animate-in slide-in-from-top-2 ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><path d="M20 6 9 17l-5-5"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      )}
      {message}
    </div>
  );
};

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
  const isDirty              = useEditorStore((s) => s.project.isDirty);
  const lastSavedAt          = useEditorStore((s) => s.project.lastSavedAt);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  // Guardar estado inicial en el historial
  React.useEffect(() => {
    if (history.length === 0) saveToHistory();
  }, [history.length, saveToHistory]);

  // ── Aviso al cerrar con cambios sin guardar ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Toast de confirmación tras guardado exitoso ──
  useEffect(() => {
    if (lastSavedAt && !isDirty) {
      setToast({ visible: true, message: 'Proyecto guardado', type: 'success' });
      const t = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return () => clearTimeout(t);
    }
  }, [lastSavedAt]);

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 w-full h-full">
      <SaveToast {...toast} />

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
