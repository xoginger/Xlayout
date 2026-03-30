/**
 * Creado y diseñado por XO
 */

"use client";

import React from 'react';
import { Viewport } from '@/components/editor/Viewport';

/**
 * CanvasLayer — Capa semántica que envuelve el Viewport principal.
 *
 * Responsabilidades:
 * - Alojar el canvas 3D/2D (Viewport)
 * - Preparar slot para futuros rulers, grids overlays, etc.
 * - Aislar la lógica de renderizado del shell
 *
 * El Viewport interno NO se modifica — se usa tal cual.
 * Este componente ocupa todo el espacio del contenedor padre
 * usando absolute + inset-0 + display:flex para que el Viewport
 * (que usa flex-1) se expanda correctamente.
 */
export const CanvasLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 z-[1] flex">
      <Viewport />
    </div>
  );
};
