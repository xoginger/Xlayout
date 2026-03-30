/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * Tipos centrales del Intent Engine — Fase 4
 *
 * Define todas las estructuras de datos que el motor de intención
 * utiliza para comunicar inputs, outputs y recomendaciones.
 * ═══════════════════════════════════════════════════════════════════ */

/* ─── Intenciones soportadas ─── */

export type IntentType =
  | 'idle'       // Sin intención detectada — UI por defecto
  | 'transform'  // Mover, rotar, escalar objeto(s)
  | 'dimension'  // Medir / acotar distancias
  | 'insert'     // Insertar producto desde catálogo
  | 'align'      // Alinear / aproximar a bordes, centros, grid
  | 'edit'       // Edición rápida de propiedades
  | 'navigate';  // Navegación pura (orbitar, panear, zoom)

/* ─── Modo de snapping prioritario ─── */

export type SnapMode =
  | 'default'     // Sin priorización especial
  | 'grid'        // Grid + bordes
  | 'vertex'      // Vértices, extremos, intersecciones
  | 'surface'     // Piso, muros, regiones válidas
  | 'edge'        // Bordes y centros de objetos
  | 'none';       // Reducir ruido de snap (navegación)

/* ─── Acción sugerida para UI ─── */

export interface SuggestedAction {
  /** Identificador único de la acción */
  id: string;
  /** Etiqueta visible en español */
  label: string;
  /** Grupo de la acción para agrupación visual */
  group: 'primary' | 'secondary';
  /** Tipo de herramienta a activar si se ejecuta */
  toolType?: string;
}

/* ─── Pista visual (hint) ─── */

export interface IntentHint {
  /** Tipo de pista para renderizado visual */
  type: 'snap-guide' | 'proximity' | 'alignment' | 'info' | 'suggestion';
  /** Texto descriptivo corto */
  message: string;
  /** Posición en pantalla (px) si aplica */
  position?: { x: number; y: number };
  /** Duración de visibilidad en ms (0 = persistente mientras aplique) */
  duration: number;
}

/* ─── Flags de supresión de UI ─── */

export interface UiSuppressionFlags {
  /** Ocultar overlays no esenciales (durante navegación) */
  suppressOverlays: boolean;
  /** Reducir indicadores de snap (durante navegación) */
  suppressSnap: boolean;
  /** Ocultar inspector contextual flotante */
  suppressInspector: boolean;
  /** Reducir hints visuales */
  suppressHints: boolean;
}

/* ─── Contexto de entrada para el motor ─── */

export interface IntentContext {
  /* ── Estado de selección ── */
  selectedIds: string[];
  selectedType: string | null;
  hasSelection: boolean;
  isMultiSelection: boolean;

  /* ── Herramienta activa ── */
  activeTool: string;

  /* ── Estado del catálogo ── */
  catalogOpen: boolean;

  /* ── Modo de vista ── */
  viewMode: '2D' | '3D';

  /* ── Interacción del usuario ── */
  isNavigating: boolean;       // ¿Está orbitando/paneando/haciendo zoom?
  isDragging: boolean;         // ¿Hay drag activo sobre un objeto?
  isGizmoActive: boolean;      // ¿Hay gizmo de transformación activo?
  timeSinceLastAction: number; // ms desde la última interacción significativa

  /* ── Contexto espacial ── */
  nearbyObjectCount: number;   // Objetos cercanos al cursor
  cursorOverObject: boolean;   // ¿El cursor está sobre un objeto?
  cursorOverGizmo: boolean;    // ¿El cursor está sobre el gizmo?
}

/* ─── Salida del motor de intención ─── */

export interface IntentOutput {
  /** Intención detectada con mayor confianza */
  intent: IntentType;

  /** Nivel de confianza [0..1] */
  confidence: number;

  /** Intención anterior (para transiciones suaves) */
  previousIntent: IntentType;

  /** Acciones sugeridas ordenadas por relevancia */
  suggestedActions: SuggestedAction[];

  /** Modo de snapping recomendado */
  snapMode: SnapMode;

  /** Pistas visuales activas */
  hints: IntentHint[];

  /** Flags para ocultar UI no relevante */
  suppression: UiSuppressionFlags;

  /** Etiqueta legible de la intención (para status bar) */
  intentLabel: string;
}

/* ─── Preferencias del usuario para el motor ─── */

export interface IntentPreferences {
  /** Motor activado o desactivado */
  enabled: boolean;
  /** Nivel de agresividad de las sugerencias: 'minimal' | 'balanced' | 'proactive' */
  aggressiveness: 'minimal' | 'balanced' | 'proactive';
  /** Mostrar hints visuales */
  showHints: boolean;
  /** Mostrar indicador de intención en la barra de estado */
  showStatusIndicator: boolean;
}

/* ─── Constantes por defecto ─── */

export const DEFAULT_PREFERENCES: IntentPreferences = {
  enabled: true,
  aggressiveness: 'balanced',
  showHints: true,
  showStatusIndicator: true,
};

export const IDLE_OUTPUT: IntentOutput = {
  intent: 'idle',
  confidence: 0,
  previousIntent: 'idle',
  suggestedActions: [],
  snapMode: 'default',
  hints: [],
  suppression: {
    suppressOverlays: false,
    suppressSnap: false,
    suppressInspector: false,
    suppressHints: false,
  },
  intentLabel: '',
};
