/**
 * Creado y diseñado por XO
 */
import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editor-store';

/**
 * Hook para Autosave Profesional (SaaS).
 * Reacciona cuando el store marca el estado como "unsaved" e inicia el debounce.
 */
export function useAutosave(debounceMs = 3000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extraer sólo lo que nos importa
  const saveStatus = useEditorStore((s) => s.project.saveStatus);
  const projectId = useEditorStore((s) => s.project.id);

  useEffect(() => {
    // Cancelar siempre posibles timers colgados si cambia el status o unmount
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Regla: No autosave si no tiene id formal
    if (projectId === 'default') return;

    if (saveStatus === 'unsaved') {
      timeoutRef.current = setTimeout(() => {
        useEditorStore.getState().saveProject('autosave').catch((err: any) => {
            console.error('[Autosave] Error en guardado silencioso.', err);
        });
      }, debounceMs);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [saveStatus, projectId, debounceMs]);
}
