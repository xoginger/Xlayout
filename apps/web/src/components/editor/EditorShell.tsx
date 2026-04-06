/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useState, useEffect } from 'react';
import { LeftToolbar } from '@/components/editor/LeftToolbar';
import { BottomStatusBar } from '@/components/editor/BottomStatusBar';
import { CanvasLayer } from '@/components/editor/layers/CanvasLayer';
import { OverlayLayer } from '@/components/editor/layers/OverlayLayer';
import { SidePanelsLayer } from '@/components/editor/layers/SidePanelsLayer';
import { useEditorStore } from '@/store/editor-store';
import { useAutosave } from '@/hooks/useAutosave';
import { useIntentEngine } from '@/hooks/useIntentEngine';
import { useModelPreload } from '@/hooks/useModelPreload';
import { CommandPalette } from '@/components/editor/CommandPalette';
import { CatalogPanel } from '@/components/editor/CatalogPanel';
import './editor-shell.css';

/**
 * EditorShell — Shell principal del editor XLayout.
 *
 * Arquitectura por capas:
 * 1. ToolSystemLayer  → Barra de herramientas (LeftToolbar)
 * 2. CanvasLayer      → Viewport 3D/2D
 * 3. SidePanelsLayer  → Catálogo + Inspector (flotantes sobre canvas)
 * 4. OverlayLayer     → HUDs, modales del canvas, acciones contextuales
 * 5. StatusLayer      → Barra de estado inferior
 *
 * Cada capa es independiente y encapsula una responsabilidad.
 * Los componentes internos NO se modifican — se usan tal cual.
 */
export const EditorShell: React.FC = () => {
  const saveToHistory   = useEditorStore((s) => s.saveToHistory);
  const history         = useEditorStore((s) => s.history);
  const project         = useEditorStore((s) => s.project);

  // ── Activación del Autosave Profesional (Debounce 3000ms) ──
  useAutosave(3000);

  // ── Motor de Intención (Fase 4) — evalúa contexto cada 100ms ──
  useIntentEngine();

  // ── Preload inteligente de modelos 3D ──
  useModelPreload();

  // ── Guardar estado inicial en el historial ──
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

  return (
    <div className="editor-shell">
      {/* ── Capa 1: Sistema de Herramientas (barra lateral izquierda) ── */}
      <div className="editor-shell__toolbar">
        <LeftToolbar />
      </div>

      {/* ── Capa 2: Canvas + Paneles + Overlays ── */}
      {/*
        El canvas y sus capas flotantes comparten la misma celda del grid.
        SidePanelsLayer y OverlayLayer se posicionan absolute dentro de
        este contenedor relativo, flotando sobre el Viewport sin bloquearlo.
      */}
      <div className="editor-shell__canvas">
        {/* Canvas real (Viewport 3D/2D) — ocupa todo el espacio */}
        <CanvasLayer />

        {/* Paneles laterales flotantes (Catálogo + Inspector) */}
        <SidePanelsLayer />

        {/* Overlays del canvas (HUDs, modales, acciones contextuales) */}
        <OverlayLayer />
      </div>

      {/* ── Capa 5: Barra de Estado ── */}
      <div className="editor-shell__status">
        <BottomStatusBar />
      </div>

      {/* ── Capa 6: Paleta de Comandos Global (Ctrl+K) ── */}
      <CommandPalette />

      {/* ── Capa 7: Catálogo Overlay Global (Tab) ── */}
      <CatalogPanel />
    </div>
  );
};
