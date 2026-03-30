/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * Reglas determinísticas del Intent Engine — Fase 4
 *
 * Cada función evalúa una intención específica basándose SOLO en el
 * contexto recibido. Sin estado, sin side-effects. Funciones puras.
 *
 * Retorna un objeto con la intención, confianza y recomendaciones.
 * El motor selecciona la regla con mayor confianza.
 * ═══════════════════════════════════════════════════════════════════ */

import type {
  IntentContext,
  IntentType,
  SuggestedAction,
  SnapMode,
  IntentHint,
  UiSuppressionFlags,
} from './intent-types';

/* ─── Resultado de evaluación de una regla ─── */

export interface RuleResult {
  intent: IntentType;
  confidence: number;
  actions: SuggestedAction[];
  snapMode: SnapMode;
  hints: IntentHint[];
  suppression: Partial<UiSuppressionFlags>;
  label: string;
}

/* ─── Herramientas agrupadas por categoría ─── */

const TRANSFORM_TOOLS = new Set(['move', 'rotate', 'scale']);
const DIMENSION_TOOLS = new Set(['dimension', 'tape']);
const CREATION_TOOLS = new Set(['line', 'rectangle', 'circle', 'wall', 'extrude', 'offset']);
const NAVIGATION_TOOLS = new Set(['orbit', 'pan', 'zoom']);
const INSERT_TOOLS = new Set(['product', 'place-opening']);

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 1 — INTENCIÓN DE NAVEGACIÓN
 *
 * Prioridad MÁXIMA cuando el usuario está orbitando, paneando o
 * haciendo zoom. Durante la navegación todo el overlay debe callarse.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateNavigateIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  // Navegación activa (orbit/pan/zoom en curso) → máxima prioridad
  if (ctx.isNavigating) {
    confidence = 0.95;
  }
  // Herramienta de navegación activa sin drag → alta prioridad
  else if (NAVIGATION_TOOLS.has(ctx.activeTool)) {
    confidence = 0.85;
  }

  return {
    intent: 'navigate',
    confidence,
    actions: [],
    snapMode: 'none',
    hints: [],
    suppression: {
      suppressOverlays: true,
      suppressSnap: true,
      suppressHints: true,
      // El inspector se mantiene si hay selección
      suppressInspector: !ctx.hasSelection,
    },
    label: 'Navegando',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 2 — INTENCIÓN DE TRANSFORMAR
 *
 * Detecta cuándo el usuario quiere mover, rotar o escalar.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateTransformIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  // Herramienta de transformación activa + selección → certeza alta
  if (TRANSFORM_TOOLS.has(ctx.activeTool) && ctx.hasSelection) {
    confidence = 0.92;
  }
  // Gizmo activo (arrastrando el gizmo) → certeza máxima
  else if (ctx.isGizmoActive && ctx.hasSelection) {
    confidence = 0.98;
  }
  // Drag activo sobre un objeto seleccionado
  else if (ctx.isDragging && ctx.hasSelection) {
    confidence = 0.90;
  }
  // Cursor sobre gizmo con selección (preparándose para transformar)
  else if (ctx.cursorOverGizmo && ctx.hasSelection) {
    confidence = 0.75;
  }
  // Selección activa + herramienta select + cursor sobre objeto
  else if (ctx.hasSelection && ctx.activeTool === 'select' && ctx.cursorOverObject) {
    confidence = 0.40;
  }

  const actions: SuggestedAction[] = [
    { id: 'move', label: 'Mover', group: 'primary', toolType: 'move' },
    { id: 'rotate', label: 'Rotar', group: 'primary', toolType: 'rotate' },
    { id: 'scale', label: 'Escalar', group: 'secondary', toolType: 'scale' },
    { id: 'duplicate', label: 'Duplicar', group: 'secondary' },
  ];

  const hints: IntentHint[] = [];
  if (ctx.isGizmoActive || ctx.isDragging) {
    hints.push({
      type: 'info',
      message: 'Shift: restringir eje · Ctrl: copiar',
      duration: 0,
    });
  }

  return {
    intent: 'transform',
    confidence,
    actions,
    snapMode: 'grid',
    hints,
    suppression: {},
    label: 'Transformar',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 3 — INTENCIÓN DE ACOTAR / MEDIR
 *
 * Detecta cuándo el usuario quiere medir distancias o crear cotas.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateDimensionIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  // Herramienta de acotación/flexómetro activa → certeza alta
  if (DIMENSION_TOOLS.has(ctx.activeTool)) {
    confidence = 0.93;
  }

  const actions: SuggestedAction[] = [
    { id: 'dimension', label: 'Acotar', group: 'primary', toolType: 'dimension' },
    { id: 'tape', label: 'Flexómetro', group: 'primary', toolType: 'tape' },
  ];

  const hints: IntentHint[] = [];
  if (DIMENSION_TOOLS.has(ctx.activeTool)) {
    hints.push({
      type: 'suggestion',
      message: 'Clic en dos puntos para medir',
      duration: 0,
    });
  }

  return {
    intent: 'dimension',
    confidence,
    actions,
    snapMode: 'vertex',
    hints,
    suppression: {},
    label: 'Acotar',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 4 — INTENCIÓN DE INSERCIÓN DESDE CATÁLOGO
 *
 * Detecta cuándo el usuario va a colocar un producto del catálogo.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateInsertIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  // Herramienta de inserción activa
  if (INSERT_TOOLS.has(ctx.activeTool)) {
    confidence = 0.90;
  }
  // Catálogo abierto + sin selección (probablemente va a insertar)
  else if (ctx.catalogOpen && !ctx.hasSelection) {
    confidence = 0.55;
  }
  // Catálogo abierto con selección (podría estar comparando)
  else if (ctx.catalogOpen && ctx.hasSelection) {
    confidence = 0.30;
  }

  const actions: SuggestedAction[] = [
    { id: 'place', label: 'Colocar', group: 'primary' },
    { id: 'catalog', label: 'Catálogo', group: 'secondary' },
  ];

  const hints: IntentHint[] = [];
  if (INSERT_TOOLS.has(ctx.activeTool)) {
    hints.push({
      type: 'suggestion',
      message: 'Clic para colocar · R: rotar · Esc: cancelar',
      duration: 0,
    });
  }

  return {
    intent: 'insert',
    confidence,
    actions,
    snapMode: 'surface',
    hints,
    suppression: {},
    label: 'Insertar',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 5 — INTENCIÓN DE ALINEAR / APROXIMAR
 *
 * Detecta cuándo el usuario mueve un objeto cerca de otro y
 * probablemente quiere alinear, centrar o ajustar posición.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateAlignIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  // Drag activo + objetos cercanos = probable intención de alinear
  if (ctx.isDragging && ctx.nearbyObjectCount > 0 && ctx.hasSelection) {
    confidence = 0.70;
  }
  // Transformando y hay objetos cerca
  else if (TRANSFORM_TOOLS.has(ctx.activeTool) && ctx.nearbyObjectCount > 0 && ctx.hasSelection) {
    confidence = 0.55;
  }

  const actions: SuggestedAction[] = [
    { id: 'snap-edge', label: 'Snap a borde', group: 'primary' },
    { id: 'snap-center', label: 'Snap a centro', group: 'secondary' },
    { id: 'snap-grid', label: 'Snap a grid', group: 'secondary' },
  ];

  const hints: IntentHint[] = [];
  if (ctx.isDragging && ctx.nearbyObjectCount > 0) {
    hints.push({
      type: 'alignment',
      message: `${ctx.nearbyObjectCount} objeto${ctx.nearbyObjectCount > 1 ? 's' : ''} cerca`,
      duration: 0,
    });
  }

  return {
    intent: 'align',
    confidence,
    actions,
    snapMode: 'edge',
    hints,
    suppression: {},
    label: 'Alinear',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 6 — INTENCIÓN DE EDICIÓN RÁPIDA
 *
 * Detecta cuándo el usuario quiere editar propiedades sin
 * necesidad de abrir el panel derecho completo.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateEditIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  // Selección única + sin movimiento por un tiempo razonable (>1.5s)
  if (ctx.hasSelection && !ctx.isMultiSelection && !ctx.isDragging && !ctx.isNavigating) {
    if (ctx.timeSinceLastAction > 1500) {
      confidence = 0.60;
    } else if (ctx.timeSinceLastAction > 800) {
      confidence = 0.40;
    }
  }

  const actions: SuggestedAction[] = [
    { id: 'properties', label: 'Propiedades', group: 'primary' },
    { id: 'duplicate', label: 'Duplicar', group: 'secondary' },
    { id: 'delete', label: 'Eliminar', group: 'secondary' },
  ];

  return {
    intent: 'edit',
    confidence,
    actions,
    snapMode: 'default',
    hints: [],
    suppression: {},
    label: 'Editar',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * REGLA 7 — INTENCIÓN DE CREACIÓN 2D
 *
 * Detecta cuándo el usuario está dibujando líneas, muros, etc.
 * ═══════════════════════════════════════════════════════════════════ */

export function evaluateCreationIntent(ctx: IntentContext): RuleResult {
  let confidence = 0;

  if (CREATION_TOOLS.has(ctx.activeTool)) {
    confidence = 0.88;
  }

  const actions: SuggestedAction[] = [
    { id: 'finish', label: 'Terminar', group: 'primary' },
    { id: 'undo-last', label: 'Deshacer punto', group: 'secondary' },
    { id: 'cancel', label: 'Cancelar', group: 'secondary' },
  ];

  const hints: IntentHint[] = [];
  if (CREATION_TOOLS.has(ctx.activeTool)) {
    const toolHints: Record<string, string> = {
      wall: 'Clic para colocar puntos del muro · Enter: terminar',
      line: 'Clic para trazar un segmento',
      rectangle: 'Clic y arrastra para definir el área',
      circle: 'Clic en centro, arrastra para radio',
      extrude: 'Clic en una cara y arrastra para extruir',
    };
    const msg = toolHints[ctx.activeTool];
    if (msg) {
      hints.push({ type: 'suggestion', message: msg, duration: 0 });
    }
  }

  return {
    intent: 'idle', // Usamos idle porque 'creation' no es un IntentType separado — se comporta como idle con hints
    confidence,
    actions,
    snapMode: 'vertex',
    hints,
    suppression: {},
    label: ctx.activeTool === 'wall' ? 'Dibujar muro' : 'Dibujar',
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * COLECCIÓN DE REGLAS
 *
 * Array exportado para que el motor las itere en orden.
 * ═══════════════════════════════════════════════════════════════════ */

export const ALL_RULES = [
  evaluateNavigateIntent,
  evaluateTransformIntent,
  evaluateDimensionIntent,
  evaluateInsertIntent,
  evaluateAlignIntent,
  evaluateEditIntent,
  evaluateCreationIntent,
];
