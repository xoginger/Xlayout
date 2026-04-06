/**
 * Creado y diseñado por XO
 */

import { SceneItem } from '@/store/editor-store';

/**
 * Tipos de guía de alineación visual
 */
export type AlignmentGuideType = 'edge-x' | 'edge-z' | 'center-x' | 'center-z' | 'equal-spacing';

export interface AlignmentGuide {
  /** Tipo de alineación detectada */
  type: AlignmentGuideType;
  /** Coordenada del eje donde se dibuja la guía */
  position: number;
  /** Punto de inicio de la línea guía [x, y, z] */
  from: [number, number, number];
  /** Punto de fin de la línea guía [x, y, z] */
  to: [number, number, number];
  /** Distancia al borde/centro más cercano (para snap magnético) */
  distance: number;
  /** Color de la guía */
  color: string;
  /** Etiqueta a mostrar */
  label?: string;
}

/**
 * Umbral en metros para que una guía sea considerada activa
 */
const GUIDE_THRESHOLD = 0.03;

/**
 * Calcula los bordes (AABB) de un SceneItem en coordenadas mundo
 */
function getItemBounds(item: SceneItem) {
  const hw = (item.width || 1) / 2;
  const hd = (item.depth || 1) / 2;

  return {
    minX: item.position[0] - hw,
    maxX: item.position[0] + hw,
    minZ: item.position[2] - hd,
    maxZ: item.position[2] + hd,
    centerX: item.position[0],
    centerZ: item.position[2],
  };
}

/**
 * Detecta guías de alineación entre un objeto en movimiento y el resto de objetos.
 * Retorna las guías activas (dentro del umbral) y la posición corregida.
 */
export function detectAlignmentGuides(
  movingItem: SceneItem,
  otherItems: SceneItem[],
  threshold: number = GUIDE_THRESHOLD
): { guides: AlignmentGuide[]; snappedPosition: [number, number, number] | null } {
  const guides: AlignmentGuide[] = [];
  const moving = getItemBounds(movingItem);
  let snapX: number | null = null;
  let snapZ: number | null = null;
  let bestDistX = threshold;
  let bestDistZ = threshold;

  for (const other of otherItems) {
    if (other.id === movingItem.id) continue;
    const target = getItemBounds(other);

    // ─── Alineación de bordes en X ───
    const edgeXPairs = [
      { movEdge: moving.minX, tgtEdge: target.minX, label: 'Borde izq.' },
      { movEdge: moving.minX, tgtEdge: target.maxX, label: 'Borde izq→der' },
      { movEdge: moving.maxX, tgtEdge: target.minX, label: 'Borde der→izq' },
      { movEdge: moving.maxX, tgtEdge: target.maxX, label: 'Borde der.' },
    ];

    for (const pair of edgeXPairs) {
      const dist = Math.abs(pair.movEdge - pair.tgtEdge);
      if (dist < bestDistX) {
        bestDistX = dist;
        // Calcular offset necesario para alinear
        const offset = pair.tgtEdge - pair.movEdge;
        snapX = movingItem.position[0] + offset;
        // Crear guía visual
        const guideZ = Math.min(moving.minZ, target.minZ) - 0.5;
        const guideZMax = Math.max(moving.maxZ, target.maxZ) + 0.5;
        guides.push({
          type: 'edge-x',
          position: pair.tgtEdge,
          from: [pair.tgtEdge, 0.01, guideZ],
          to: [pair.tgtEdge, 0.01, guideZMax],
          distance: dist,
          color: '#3b82f6',
        });
      }
    }

    // ─── Alineación de bordes en Z ───
    const edgeZPairs = [
      { movEdge: moving.minZ, tgtEdge: target.minZ, label: 'Borde sup.' },
      { movEdge: moving.minZ, tgtEdge: target.maxZ, label: 'Borde sup→inf' },
      { movEdge: moving.maxZ, tgtEdge: target.minZ, label: 'Borde inf→sup' },
      { movEdge: moving.maxZ, tgtEdge: target.maxZ, label: 'Borde inf.' },
    ];

    for (const pair of edgeZPairs) {
      const dist = Math.abs(pair.movEdge - pair.tgtEdge);
      if (dist < bestDistZ) {
        bestDistZ = dist;
        const offset = pair.tgtEdge - pair.movEdge;
        snapZ = movingItem.position[2] + offset;
        const guideX = Math.min(moving.minX, target.minX) - 0.5;
        const guideXMax = Math.max(moving.maxX, target.maxX) + 0.5;
        guides.push({
          type: 'edge-z',
          position: pair.tgtEdge,
          from: [guideX, 0.01, pair.tgtEdge],
          to: [guideXMax, 0.01, pair.tgtEdge],
          distance: dist,
          color: '#3b82f6',
        });
      }
    }

    // ─── Alineación de centros ───
    const centerDistX = Math.abs(moving.centerX - target.centerX);
    if (centerDistX < bestDistX) {
      bestDistX = centerDistX;
      snapX = target.centerX;
      const guideZ = Math.min(moving.minZ, target.minZ) - 0.5;
      const guideZMax = Math.max(moving.maxZ, target.maxZ) + 0.5;
      guides.push({
        type: 'center-x',
        position: target.centerX,
        from: [target.centerX, 0.01, guideZ],
        to: [target.centerX, 0.01, guideZMax],
        distance: centerDistX,
        color: '#a855f7',
        label: 'Centro',
      });
    }

    const centerDistZ = Math.abs(moving.centerZ - target.centerZ);
    if (centerDistZ < bestDistZ) {
      bestDistZ = centerDistZ;
      snapZ = target.centerZ;
      const guideX = Math.min(moving.minX, target.minX) - 0.5;
      const guideXMax = Math.max(moving.maxX, target.maxX) + 0.5;
      guides.push({
        type: 'center-z',
        position: target.centerZ,
        from: [guideX, 0.01, target.centerZ],
        to: [guideXMax, 0.01, target.centerZ],
        distance: centerDistZ,
        color: '#a855f7',
        label: 'Centro',
      });
    }
  }

  // Solo mantener las guías más cercanas por eje
  const activeGuides = guides.filter(g => g.distance < threshold);

  // Posición corregida (snap magnético)
  const snappedPosition: [number, number, number] | null =
    (snapX !== null || snapZ !== null)
      ? [
          snapX ?? movingItem.position[0],
          movingItem.position[1],
          snapZ ?? movingItem.position[2],
        ]
      : null;

  return { guides: activeGuides, snappedPosition };
}
