/**
 * Creado y diseñado por XO
 */

import { create } from 'zustand';

/**
 * Estado del menú radial contextual.
 * Centraliza la visibilidad, posición y contexto
 * para que cualquier componente pueda abrirlo/cerrarlo.
 */

export interface RadialMenuState {
  /** ¿Está visible? */
  isOpen: boolean;
  /** Posición en pantalla (px) donde se abrió */
  position: { x: number; y: number };
  /** Contexto de la selección al momento de abrir */
  context: 'empty' | 'single' | 'multi';
  /** Abrir el menú en la posición dada */
  open: (x: number, y: number, context: 'empty' | 'single' | 'multi') => void;
  /** Cerrar el menú */
  close: () => void;
}

export const useRadialMenu = create<RadialMenuState>((set) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  context: 'empty',

  open: (x, y, context) => set({
    isOpen: true,
    position: { x, y },
    context,
  }),

  close: () => set({ isOpen: false }),
}));
