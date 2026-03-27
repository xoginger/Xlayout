/**
 * Creado y diseñado por XO
 */
import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editor-store';

/**
 * Componente minimalista de UI para informar sobre el estado de persistencia
 * de la nube del proyecto (SaaS like Figma / AutoCAD 360).
 */
export function EditorSaveStatus() {
  const { project, saveProject } = useEditorStore();
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Efecto para actualizar el "hace X tiempo" solo cuando está en estado "saved"
  useEffect(() => {
    if (project.saveStatus !== 'saved' || !project.lastSavedAt) return;
    
    const updateTime = () => {
      const now = new Date();
      const savedAt = new Date(project.lastSavedAt!);
      const diffMs = now.getTime() - savedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) setTimeAgo('Hace un momento');
      else if (diffMins === 1) setTimeAgo('Hace 1 minuto');
      else setTimeAgo(`Hace ${diffMins} minutos`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // actualizar cada 30 segs
    return () => clearInterval(interval);
  }, [project.saveStatus, project.lastSavedAt]);

  if (project.id === 'default') {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <span className="opacity-70">Proyecto sin guardar</span>
      </div>
    );
  }

  // Mapeo de UI
  switch (project.saveStatus) {
    case 'unsaved':
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-500 hover:text-amber-600 transition-colors cursor-pointer" onClick={() => saveProject()} title="Haz clic para guardar manualmente">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Cambios sin guardar</span>
        </div>
      );
    case 'saving':
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <svg className="animate-spin h-3.5 w-3.5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Guardando...</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer" onClick={() => saveProject()} title="Error de Red. Haz clic para reintentar">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Error al guardar</span>
        </div>
      );
    case 'saved':
    case 'idle':
    default:
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Guardado {project.saveStatus === 'saved' && timeAgo ? `· ${timeAgo}` : ''}</span>
        </div>
      );
  }
}
