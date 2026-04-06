/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * useModelPreload — Preload inteligente de modelos 3D al abrir proyecto
 *
 * Extrae todas las URLs únicas de model3dUrl de los SceneItems y las
 * pre-descarga en paralelo (máx 3 concurrentes) usando el ModelLoader
 * singleton. Expone progreso para el BottomStatusBar.
 * ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { ModelLoader, type PreloadProgress } from '@/lib/model-loader';
import { create } from 'zustand';

// ── Store ligero para estado del preload ──────────────────────────
interface PreloadState {
  /** Si hay un preload en progreso */
  active: boolean;
  /** Total de modelos a precargar */
  total: number;
  /** Modelos ya cargados */
  loaded: number;
  /** Modelos que fallaron */
  failed: number;
  /** Timestamp del último preload completado */
  completedAt: number | null;
  /** Actualizar progreso */
  setProgress: (p: PreloadProgress & { active: boolean }) => void;
  /** Marcar como completado */
  complete: () => void;
}

export const usePreloadStore = create<PreloadState>((set) => ({
  active: false,
  total: 0,
  loaded: 0,
  failed: 0,
  completedAt: null,
  setProgress: (p) => set({
    active: p.active,
    total: p.total,
    loaded: p.loaded,
    failed: p.failed,
  }),
  complete: () => set({
    active: false,
    completedAt: Date.now(),
  }),
}));

/**
 * Hook que pre-descarga todos los modelos 3D de la escena actual.
 * Se ejecuta una vez al montar y cada vez que cambian los items.
 */
export function useModelPreload(): void {
  const items = useEditorStore((s) => s.items);
  const setProgress = usePreloadStore((s) => s.setProgress);
  const complete = usePreloadStore((s) => s.complete);
  const lastUrlsRef = useRef<string>('');

  const doPreload = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;

    const loader = ModelLoader.getInstance();

    setProgress({
      active: true,
      total: urls.length,
      loaded: 0,
      failed: 0,
    });

    await loader.preload(urls, (progress) => {
      setProgress({
        active: true,
        ...progress,
      });
    });

    complete();
  }, [setProgress, complete]);

  useEffect(() => {
    // Extraer URLs únicas de modelos 3D
    const urls = [...new Set(
      items
        .map((item) => item.model3dUrl)
        .filter((url): url is string => !!url)
    )];

    // Evitar re-preload si las URLs no cambiaron
    const urlsKey = urls.sort().join('|');
    if (urlsKey === lastUrlsRef.current) return;
    lastUrlsRef.current = urlsKey;

    // Preload en background (no bloquea rendering)
    doPreload(urls);
  }, [items, doPreload]);
}
