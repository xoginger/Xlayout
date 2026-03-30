/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * useIntentEngine — Hook React del motor de intención
 *
 * Conecta el editor-store y el intent-store → motor → UI.
 *
 * Se ejecuta en un useEffect throttled (~100ms) para no degradar
 * el rendimiento del editor. Lee todos los inputs necesarios del
 * store y emite un IntentOutput que los componentes UI consumen.
 * ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useIntentStore } from '@/intent/intent-store';
import { resolveIntent } from '@/intent/intent-engine';
import type { IntentContext } from '@/intent/intent-types';

/** Intervalo de evaluación del motor (ms) */
const EVAL_INTERVAL = 100;

/**
 * Hook que ejecuta el Intent Engine periódicamente.
 * Debe montarse UNA sola vez en el EditorShell.
 */
export function useIntentEngine(): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevIntentRef = useRef<'idle' | 'transform' | 'dimension' | 'insert' | 'align' | 'edit' | 'navigate'>('idle');

  const evaluate = useCallback(() => {
    /* ── Leer preferencias — si está desactivado, emitir idle ── */
    const intentState = useIntentStore.getState();
    if (!intentState.preferences.enabled) return;

    /* ── Leer estado del editor ── */
    const editorState = useEditorStore.getState();

    /* ── Construir contexto ── */
    const context: IntentContext = {
      /* Selección */
      selectedIds: editorState.selectedIds,
      selectedType: editorState.selectedType,
      hasSelection: editorState.selectedIds.length > 0,
      isMultiSelection: editorState.selectedIds.length > 1,

      /* Herramienta */
      activeTool: editorState.activeTool,

      /* Catálogo */
      catalogOpen: editorState.catalogPanelState === 'open',

      /* Modo de vista */
      viewMode: editorState.viewMode,

      /* Señales de interacción (escritas por el Viewport) */
      isNavigating: intentState.isNavigating,
      isDragging: intentState.isDragging,
      isGizmoActive: intentState.isGizmoActive,
      cursorOverObject: intentState.cursorOverObject,
      cursorOverGizmo: intentState.cursorOverGizmo,
      nearbyObjectCount: intentState.nearbyObjectCount,

      /* Tiempo desde última acción significativa */
      timeSinceLastAction: Date.now() - intentState.lastActionTimestamp,
    };

    /* ── Ejecutar motor ── */
    const output = resolveIntent(context, prevIntentRef.current);

    /* ── Solo actualizar si cambió la intención o confianza ── */
    const current = intentState.output;
    if (
      output.intent !== current.intent ||
      Math.abs(output.confidence - current.confidence) > 0.05 ||
      output.intentLabel !== current.intentLabel
    ) {
      prevIntentRef.current = output.intent;
      intentState.setOutput(output);
    }
  }, []);

  useEffect(() => {
    // Evaluación periódica throttled
    timerRef.current = setInterval(evaluate, EVAL_INTERVAL);

    // Primera evaluación inmediata
    evaluate();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [evaluate]);
}
