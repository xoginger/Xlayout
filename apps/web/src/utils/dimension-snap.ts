/**
 * Creado y diseñado por XO
 */

// ─── Motor de Snapping Especializado para Acotaciones ───────────────────────
// Detecta puntos de alineación relevantes en la escena para la herramienta
// de acotado: vértices de muros, esquinas de items, puntos medios, centros.

import * as THREE from 'three';
import type { Wall, SceneItem, LineEntity, RectangleEntity } from '@/store/editor-store';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type DimensionSnapType = 'vertex' | 'edge-midpoint' | 'center' | 'grid' | 'endpoint';

export interface DimensionSnapResult {
  point: [number, number, number];
  type: DimensionSnapType;
  label: string;
  color: string;
  /** ID de la entidad fuente (para resaltado) */
  sourceId?: string;
}

// ─── Colores por Tipo de Snap ───────────────────────────────────────────────
const SNAP_COLORS: Record<DimensionSnapType, string> = {
  vertex: '#3b82f6',        // Azul — vértices/esquinas
  'edge-midpoint': '#10b981', // Verde — puntos medios
  center: '#f59e0b',        // Ámbar — centros de objetos
  grid: '#94a3b8',          // Gris — rejilla
  endpoint: '#8b5cf6',      // Violeta — extremos de líneas/cotas existentes
};

const SNAP_LABELS: Record<DimensionSnapType, string> = {
  vertex: 'Vértice',
  'edge-midpoint': 'Punto Medio',
  center: 'Centro',
  grid: 'Rejilla',
  endpoint: 'Extremo',
};

// ─── Recolección de Puntos Snappeables ──────────────────────────────────────

interface SnapCandidate {
  point: [number, number, number];
  type: DimensionSnapType;
  sourceId?: string;
}

/**
 * Recolecta todos los puntos significativos de la escena para snapping.
 * Prioridad de snap: vertex > endpoint > edge-midpoint > center > grid
 */
export function collectSnapCandidates(
  walls: Wall[],
  items: SceneItem[],
  lines: LineEntity[],
  rectangles: RectangleEntity[]
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  // 1. Vértices de muros (start y end)
  for (const wall of walls) {
    candidates.push({ point: [...wall.start] as [number, number, number], type: 'vertex', sourceId: wall.id });
    candidates.push({ point: [...wall.end] as [number, number, number], type: 'vertex', sourceId: wall.id });

    // Punto medio de cada muro
    candidates.push({
      point: [
        (wall.start[0] + wall.end[0]) / 2,
        (wall.start[1] + wall.end[1]) / 2,
        (wall.start[2] + wall.end[2]) / 2
      ],
      type: 'edge-midpoint',
      sourceId: wall.id
    });

    // Esquinas del muro (considerando espesor)
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[2] - wall.start[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0.01) {
      const nx = -dz / len * wall.thickness / 2;
      const nz = dx / len * wall.thickness / 2;
      candidates.push({ point: [wall.start[0] + nx, 0, wall.start[2] + nz], type: 'vertex', sourceId: wall.id });
      candidates.push({ point: [wall.start[0] - nx, 0, wall.start[2] - nz], type: 'vertex', sourceId: wall.id });
      candidates.push({ point: [wall.end[0] + nx, 0, wall.end[2] + nz], type: 'vertex', sourceId: wall.id });
      candidates.push({ point: [wall.end[0] - nx, 0, wall.end[2] - nz], type: 'vertex', sourceId: wall.id });
    }
  }

  // 2. Esquinas y centros de items (bounding box en plano XZ)
  for (const item of items) {
    const hw = item.width / 2;
    const hd = item.depth / 2;
    const px = item.position[0];
    const pz = item.position[2];

    // 4 esquinas del bounding box en el suelo
    const corners: [number, number, number][] = [
      [px - hw, 0, pz - hd],
      [px + hw, 0, pz - hd],
      [px + hw, 0, pz + hd],
      [px - hw, 0, pz + hd],
    ];
    for (const corner of corners) {
      candidates.push({ point: corner, type: 'vertex', sourceId: item.id });
    }

    // Puntos medios de las aristas del bounding box
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      candidates.push({
        point: [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2],
        type: 'edge-midpoint',
        sourceId: item.id
      });
    }

    // Centro del item
    candidates.push({
      point: [px, 0, pz],
      type: 'center',
      sourceId: item.id
    });
  }

  // 3. Extremos y puntos medios de líneas
  for (const line of lines) {
    candidates.push({ point: [...line.start] as [number, number, number], type: 'endpoint', sourceId: line.id });
    candidates.push({ point: [...line.end] as [number, number, number], type: 'endpoint', sourceId: line.id });
    candidates.push({
      point: [
        (line.start[0] + line.end[0]) / 2,
        (line.start[1] + line.end[1]) / 2,
        (line.start[2] + line.end[2]) / 2
      ],
      type: 'edge-midpoint',
      sourceId: line.id
    });
  }

  // 4. Esquinas y centros de rectángulos
  for (const rect of rectangles) {
    const corners: [number, number, number][] = [
      [rect.start[0], 0, rect.start[2]],
      [rect.end[0], 0, rect.start[2]],
      [rect.end[0], 0, rect.end[2]],
      [rect.start[0], 0, rect.end[2]],
    ];
    for (const corner of corners) {
      candidates.push({ point: corner, type: 'vertex', sourceId: rect.id });
    }
    // Centro
    candidates.push({
      point: [
        (rect.start[0] + rect.end[0]) / 2,
        0,
        (rect.start[2] + rect.end[2]) / 2
      ],
      type: 'center',
      sourceId: rect.id
    });
  }

  return candidates;
}

// ─── Búsqueda del Snap Más Cercano ──────────────────────────────────────────

/**
 * Encuentra el punto de snap más cercano al cursor dentro del umbral.
 * Los tipos de snap tienen prioridad implícita por distancia (el más cercano gana).
 *
 * @param cursor - Posición actual del cursor en el espacio mundial
 * @param candidates - Puntos candidatos pre-calculados
 * @param threshold - Distancia máxima para considerar un snap (metros)
 * @returns El snap más cercano o null si no hay ninguno dentro del umbral
 */
export function findDimensionSnap(
  cursor: [number, number, number],
  candidates: SnapCandidate[],
  threshold: number = 0.3
): DimensionSnapResult | null {
  let best: SnapCandidate | null = null;
  let bestDist = threshold;

  // Prioridades: vertex (0.85x), endpoint (0.9x), edge-midpoint (1.0x), center (1.1x)
  // Multiplicamos la distancia por un factor de prioridad para que los vértices ganen en empates
  const priorityFactor: Record<DimensionSnapType, number> = {
    vertex: 0.85,
    endpoint: 0.9,
    'edge-midpoint': 1.0,
    center: 1.1,
    grid: 1.5,
  };

  for (const candidate of candidates) {
    const dx = candidate.point[0] - cursor[0];
    const dz = candidate.point[2] - cursor[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const weightedDist = dist * (priorityFactor[candidate.type] || 1.0);

    if (weightedDist < bestDist) {
      bestDist = weightedDist;
      best = candidate;
    }
  }

  if (!best) return null;

  return {
    point: best.point,
    type: best.type,
    label: SNAP_LABELS[best.type],
    color: SNAP_COLORS[best.type],
    sourceId: best.sourceId,
  };
}

/**
 * Snap al grid como fallback cuando no hay puntos cercanos.
 */
export function snapToGridForDimension(
  point: [number, number, number],
  gridSize: number
): DimensionSnapResult {
  return {
    point: [
      Math.round(point[0] / gridSize) * gridSize,
      point[1],
      Math.round(point[2] / gridSize) * gridSize,
    ],
    type: 'grid',
    label: SNAP_LABELS.grid,
    color: SNAP_COLORS.grid,
  };
}
