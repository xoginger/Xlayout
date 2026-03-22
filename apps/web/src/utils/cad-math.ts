/**
 * Creado y diseñado por XO
 */

import type { SceneItemType } from '@/store/editor-store';
import * as THREE from 'three';

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type InferenceType = 'endpoint' | 'midpoint' | 'center' | 'axis' | 'grid' | 'none';

export interface SnapInference {
  point: [number, number, number];
  type: InferenceType;
  color: string;
  axis?: 'x' | 'y' | 'z';
  label?: string;
}

// ─── Colores de Ejes (Estilo SketchUp) ──────────────────────────────────────────
export const AXIS_COLORS = {
  x: '#ff4444', // Red
  y: '#44ff44', // Green
  z: '#4444ff', // Blue
  none: '#ffffff'
};

// ─── Utilidades de Alineación al Suelo ──────────────────────────────────────────────
const ITEM_HALF_HEIGHTS: Record<SceneItemType | 'default', number> = {
  rack:          1.000,
  shelf:         0.900,
  desk:          0.375,
  cabinet:       0.600,
  'catalog-item': 0.500,
  default:       0.500,
};

export const getItemHalfHeight = (type: string): number =>
  ITEM_HALF_HEIGHTS[type as SceneItemType] ?? ITEM_HALF_HEIGHTS.default;

export const calculateDistance = (p1: [number, number, number], p2: [number, number, number]): number => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// ─── Motor de Inferencia Avanzado ───────────────────────────────────────────────

/** Detecta si un punto está alineado con un eje principal relativo a un punto de inicio. */
export const getAxisInference = (
  start: [number, number, number], 
  current: [number, number, number],
  lockedAxis: 'x' | 'y' | 'z' | null = null,
  tolerance: number = 0.05
): SnapInference | null => {
  const dx = current[0] - start[0];
  const dy = current[1] - start[1];
  const dz = current[2] - start[2];

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const absZ = Math.abs(dz);

  // Si está bloqueado, proyecta el punto actual sobre ese eje
  if (lockedAxis === 'x') {
    return { point: [current[0], start[1], start[2]], type: 'axis', axis: 'x', color: AXIS_COLORS.x, label: 'Eje X' };
  }
  if (lockedAxis === 'y') {
    return { point: [start[0], current[1], start[2]], type: 'axis', axis: 'y', color: AXIS_COLORS.y, label: 'Eje Y' };
  }
  if (lockedAxis === 'z') {
    return { point: [start[0], start[1], current[2]], type: 'axis', axis: 'z', color: AXIS_COLORS.z, label: 'Eje Z' };
  }

  // Inferencia automática basada en proximidad
  // Verificamos qué eje tiene la menor diferencia relativa
  if (absX > tolerance && absY < tolerance && absZ < tolerance) {
    return { point: [current[0], start[1], start[2]], type: 'axis', axis: 'x', color: AXIS_COLORS.x, label: 'Eje X' };
  }
  if (absY > tolerance && absX < tolerance && absZ < tolerance) {
    return { point: [start[0], current[1], start[2]], type: 'axis', axis: 'y', color: AXIS_COLORS.y, label: 'Eje Y' };
  }
  if (absZ > tolerance && absX < tolerance && absY < tolerance) {
    return { point: [start[0], start[1], current[2]], type: 'axis', axis: 'z', color: AXIS_COLORS.z, label: 'Eje Z' };
  }

  return null;
};

export const findInference = (
  point: [number, number, number],
  segments: { start: [number, number, number], end: [number, number, number] }[],
  threshold: number = 0.2, // Slightly tighter threshold for professional feel
  startPoint: [number, number, number] | null = null,
  lockedAxis: 'x' | 'y' | 'z' | null = null
): SnapInference => {
  // 1. Eje bloqueado (Máxima prioridad si se proporciona)
  if (startPoint && lockedAxis) {
    const axisInf = getAxisInference(startPoint, point, lockedAxis);
    if (axisInf) return axisInf;
  }

  // 2. Verificar extremos
  for (const seg of segments) {
    if (calculateDistance(point, seg.start) < threshold) {
      return { point: seg.start, type: 'endpoint', color: '#3b82f6', label: 'Punto Final' };
    }
    if (calculateDistance(point, seg.end) < threshold) {
      return { point: seg.end, type: 'endpoint', color: '#3b82f6', label: 'Punto Final' };
    }
  }

  // 3. Verificar puntos medios
  for (const seg of segments) {
    const mid: [number, number, number] = [
      (seg.start[0] + seg.end[0]) / 2,
      (seg.start[1] + seg.end[1]) / 2,
      (seg.start[2] + seg.end[2]) / 2
    ];
    if (calculateDistance(point, mid) < threshold) {
      return { point: mid, type: 'midpoint', color: '#10b981', label: 'Punto Medio' };
    }
  }

  // 4. Verificar inferencia de ejes (si no está bloqueado, auto-detectar)
  if (startPoint) {
    const axisInf = getAxisInference(startPoint, point);
    if (axisInf) return axisInf;
  }

  // 5. Fallback
  return { point, type: 'none', color: '#ffffff' };
};

// ─── Utilidades de Geometría ──────────────────────────────────────────────────────

export const snapToGrid = (value: number, gridSize: number = 0.5): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapPointToGrid = (point: [number, number, number], gridSize: number = 0.5): [number, number, number] => {
  return [
    snapToGrid(point[0], gridSize),
    snapToGrid(point[1], gridSize),
    snapToGrid(point[2], gridSize)
  ];
};

export const getWallAngle = (start: [number, number, number], end: [number, number, number]): number => {
  return Math.atan2(end[2] - start[2], end[0] - start[0]);
};

export const getWallCenter = (start: [number, number, number], end: [number, number, number]): [number, number, number] => {
  return [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];
};

export const getOrthogonalPoint = (
  start: [number, number, number],
  current: [number, number, number]
): [number, number, number] => {
  const dx = Math.abs(current[0] - start[0]);
  const dz = Math.abs(current[2] - start[2]);
  return dx > dz ? [current[0], start[1], start[2]] : [start[0], start[1], current[2]];
};

/**
 * Calcula el área con signo de un polígono 2D.
 */
export const getPolygonArea2D = (points: [number, number][]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return area / 2;
};

/** Asegura que el orden de los puntos sea antihorario (CCW) en el espacio 2D. */
export const ensureCCW2D = (points: [number, number][]): [number, number][] => {
  if (getPolygonArea2D(points) < 0) {
    return [...points].reverse();
  }
  return points;
};

/**
 * Calculates the signed area of a 2D polygon in the XZ plane.
 * Positive = Counter-Clockwise (CCW)
 */
export const getPolygonArea = (points: [number, number, number][]): number => {
  return getPolygonArea2D(points.map(p => [p[0], p[2]]));
};

/** Ensures point winding order is Counter-Clockwise. */
export const ensureCounterClockwise = (points: [number, number, number][]): [number, number, number][] => {
  if (getPolygonArea(points) < 0) {
    return [...points].reverse();
  }
  return points;
};

/** Detecta bucles para la generación automática de caras. */
export const detectClosedLoops = (
  segments: { start: [number, number, number], end: [number, number, number] }[]
): [number, number, number][][] => {
  const graph: Map<string, [number, number, number][]> = new Map();
  const pointToCoord: Map<string, [number, number, number]> = new Map();

  const getRef = (p: [number, number, number]) => {
    const ref = `${p[0].toFixed(3)},${p[2].toFixed(3)}`;
    if (!pointToCoord.has(ref)) pointToCoord.set(ref, p);
    return ref;
  };

  for (const seg of segments) {
    const r1 = getRef(seg.start);
    const r2 = getRef(seg.end);
    if (r1 === r2) continue;
    if (!graph.has(r1)) graph.set(r1, []);
    if (!graph.has(r2)) graph.set(r2, []);
    graph.get(r1)!.push(pointToCoord.get(r2)!);
    graph.get(r2)!.push(pointToCoord.get(r1)!);
  }

  const loops: [number, number, number][][] = [];
  const visited = new Set<string>();
  
  const findCycles = (node: string, path: string[], coords: [number, number, number][], parent: string | null) => {
    visited.add(node);
    path.push(node);
    coords.push(pointToCoord.get(node)!);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      const neighborRef = getRef(neighbor);
      if (neighborRef === parent) continue;
      if (neighborRef === path[0] && path.length >= 3) {
        loops.push(ensureCounterClockwise([...coords]));
        continue;
      }
      if (!visited.has(neighborRef)) {
        findCycles(neighborRef, [...path], [...coords], node);
      }
    }
  };

  for (const node of graph.keys()) {
    if (!visited.has(node)) findCycles(node, [], [], null);
  }
  return loops.filter(l => l.length >= 3);
};
