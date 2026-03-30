/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import { RightInspector } from '@/components/editor/RightInspector';
import { useEditorStore } from '@/store/editor-store';

/**
 * SidePanelsLayer — Capa de paneles laterales flotantes.
 *
 * Responsabilidades:
 * - Alojar paneles que flotan a los lados del canvas
 * - NO bloquear eventos del canvas (pointer-events: none en el contenedor)
 * - Los paneles individuales SÍ reciben eventos (pointer-events: auto via CSS)
 *
 * Paneles actuales:
 * - RightInspector (derecha) — Solo visible en modo avanzado
 *
 * Nota: El CatalogPanel ahora es un overlay global (montado en EditorShell)
 */
export const SidePanelsLayer: React.FC = () => {
  const advancedMode = useEditorStore((s) => s.advancedMode);

  return (
    <div className="editor-shell__panels">
      {/* Spacer flexible — pointer-events: none para NO bloquear el canvas */}
      <div className="flex-1" style={{ pointerEvents: 'none' }} />

      {/* Inspector de Propiedades (derecha) — Solo modo avanzado */}
      {advancedMode && <RightInspector />}
    </div>
  );
};
