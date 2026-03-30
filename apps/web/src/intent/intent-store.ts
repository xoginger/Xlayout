/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * Intent Store — Estado persistente del motor de intención
 *
 * Almacena:
 * - La intención actual calculada por el motor
 * - Señales de interacción del usuario (navegación, drag, gizmo)
 * - Preferencias del usuario (localStorage)
 * ═══════════════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import type {
  IntentOutput,
  IntentPreferences,
} from './intent-types';
import { IDLE_OUTPUT, DEFAULT_PREFERENCES } from './intent-types';

/* ─── Leer preferencias desde localStorage ─── */

function loadPreferences(): IntentPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem('xlayout:intent-preferences');
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    // Ignorar errores de parseo
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: IntentPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('xlayout:intent-preferences', JSON.stringify(prefs));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

/* ─── Interfaz del Store ─── */

export interface IntentStoreState {
  /** Salida actual del motor de intención */
  output: IntentOutput;
  /** Preferencias del usuario */
  preferences: IntentPreferences;

  /* ── Señales de interacción (escritas por el Viewport) ── */
  isNavigating: boolean;
  isDragging: boolean;
  isGizmoActive: boolean;
  cursorOverObject: boolean;
  cursorOverGizmo: boolean;
  nearbyObjectCount: number;
  lastActionTimestamp: number;

  /* ── Acciones ── */
  setOutput: (output: IntentOutput) => void;
  setNavigating: (val: boolean) => void;
  setDragging: (val: boolean) => void;
  setGizmoActive: (val: boolean) => void;
  setCursorOverObject: (val: boolean) => void;
  setCursorOverGizmo: (val: boolean) => void;
  setNearbyObjectCount: (count: number) => void;
  touchLastAction: () => void;
  updatePreferences: (partial: Partial<IntentPreferences>) => void;
  toggleEnabled: () => void;
}

export const useIntentStore = create<IntentStoreState>((set, get) => ({
  output: IDLE_OUTPUT,
  preferences: loadPreferences(),

  /* ── Señales de interacción ── */
  isNavigating: false,
  isDragging: false,
  isGizmoActive: false,
  cursorOverObject: false,
  cursorOverGizmo: false,
  nearbyObjectCount: 0,
  lastActionTimestamp: Date.now(),

  /* ── Setters ── */
  setOutput: (output) => set({ output }),

  setNavigating: (val) => {
    if (get().isNavigating !== val) set({ isNavigating: val });
  },

  setDragging: (val) => {
    if (get().isDragging !== val) {
      set({ isDragging: val, lastActionTimestamp: Date.now() });
    }
  },

  setGizmoActive: (val) => {
    if (get().isGizmoActive !== val) {
      set({ isGizmoActive: val, lastActionTimestamp: Date.now() });
    }
  },

  setCursorOverObject: (val) => {
    if (get().cursorOverObject !== val) set({ cursorOverObject: val });
  },

  setCursorOverGizmo: (val) => {
    if (get().cursorOverGizmo !== val) set({ cursorOverGizmo: val });
  },

  setNearbyObjectCount: (count) => {
    if (get().nearbyObjectCount !== count) set({ nearbyObjectCount: count });
  },

  touchLastAction: () => set({ lastActionTimestamp: Date.now() }),

  updatePreferences: (partial) => {
    const current = get().preferences;
    const next = { ...current, ...partial };
    savePreferences(next);
    set({ preferences: next });
  },

  toggleEnabled: () => {
    const current = get().preferences;
    const next = { ...current, enabled: !current.enabled };
    savePreferences(next);
    set({ preferences: next });
  },
}));
