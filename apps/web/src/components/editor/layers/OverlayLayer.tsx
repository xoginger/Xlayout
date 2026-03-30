/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import { CalibrationHUD } from '@/components/editor/CalibrationHUD';
import { ContextualInspector } from '@/components/editor/ContextualInspector';
import { RadialMenu } from '@/components/editor/RadialMenu';
import { IntentHints } from '@/components/editor/IntentHints';

/**
 * OverlayLayer — Capa de overlays flotantes sobre el canvas.
 *
 * Responsabilidades:
 * - Alojar elementos que flotan sobre el viewport (HUDs, modales del canvas)
 * - NO bloquear eventos del canvas (pointer-events: none en el contenedor)
 * - Los hijos individuales SÍ reciben eventos (pointer-events: auto via CSS)
 *
 * Componentes activos:
 * - CalibrationHUD: Asistente de calibración de planos
 * - ContextualInspector: Inspector flotante según selección (FASE 2)
 * - RadialMenu: Menú radial contextual por clic derecho (FASE 3)
 * - IntentHints: Pistas visuales del Intent Engine (FASE 4)
 */
export const OverlayLayer: React.FC = () => {
  return (
    <div className="editor-shell__overlay">
      {/* Inspector Flotante Contextual (Fase 2) */}
      <ContextualInspector />

      {/* HUD de calibración (existente, sin cambios internos) */}
      <CalibrationHUD />

      {/* Menú Radial Contextual (Fase 3) — se renderiza via portal (fixed) */}
      <RadialMenu />

      {/* Pistas Visuales del Intent Engine (Fase 4) */}
      <IntentHints />
    </div>
  );
};
