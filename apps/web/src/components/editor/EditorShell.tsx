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
import { useAutosave } from '@/hooks/useAutosave';

// ─── Toast de notificación de guardado (LEGACY) ─────────────────────────────────────────
// Se desactiva el Toast porque el badge superior ahora se encarga.
const SaveToast: React.FC<{ visible: boolean; message: string; type: 'success' | 'error' }> = () => null;

export const EditorShell: React.FC = () => {
  const catalogPanelState    = useEditorStore((s) => s.catalogPanelState);
  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const saveToHistory        = useEditorStore((s) => s.saveToHistory);
  const history              = useEditorStore((s) => s.history);
  const project              = useEditorStore((s) => s.project);

  // ── Activación del Autosave Profesional (Debounce 3000ms) ──
  useAutosave(3000);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  // Guardar estado inicial en el historial
  React.useEffect(() => {
    if (history.length === 0) saveToHistory();
  }, [history.length, saveToHistory]);

  // ── Aviso al cerrar con cambios sin guardar ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (project.saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [project.saveStatus]);

  // ── Toast de confirmación tras guardado exitoso ──
  useEffect(() => {
    if (project.lastSavedAt && project.saveStatus === 'saved') {
      setToast({ visible: true, message: 'Proyecto guardado', type: 'success' });
      const t = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return () => clearTimeout(t);
    }
  }, [project.lastSavedAt, project.saveStatus]);

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
