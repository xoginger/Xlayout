/**
 * Creado y diseñado por XO
 */

// ─── Motor Geométrico de Acotaciones Profesionales ──────────────────────────
// Cálculos puros para alineación, offset, extensiones y formateo de unidades.

import * as THREE from 'three';

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type DimensionUnit = 'mm' | 'cm' | 'm';
export type DimensionAlignment = 'horizontal' | 'vertical' | 'aligned' | 'free';

// Resultado completo de la geometría de una cota
export interface DimensionGeometry {
  // Línea base desplazada (donde van las flechas y el texto)
  baseStart: [number, number, number];
  baseEnd: [number, number, number];
  // Líneas de extensión (desde el punto medido hasta la línea base + extensión extra)
  extStartA: [number, number, number]; // Inicio de extensión A (cerca del punto medido)
  extEndA: [number, number, number];   // Fin de extensión A (más allá de la línea base)
  extStartB: [number, number, number]; // Inicio de extensión B
  extEndB: [number, number, number];   // Fin de extensión B
  // Puntas de flecha (triángulos en los extremos de la línea base)
  arrowA: [number, number, number][];  // 3 vértices del triángulo A
  arrowB: [number, number, number][];  // 3 vértices del triángulo B
  // Centro del texto
  textPosition: [number, number, number];
  // Ángulo de rotación para el texto (radianes en plano XZ)
  textRotation: number;
  // Dirección del offset (perpendicular a la cota)
  offsetDirection: [number, number, number];
}

// ─── Constantes ─────────────────────────────────────────────────────────────
// Gap al inicio de las líneas de extensión (no tocan el objeto)
const EXTENSION_GAP = 0.03;
// Extensión extra más allá de la línea base
const EXTENSION_OVERSHOOT = 0.06;
// Tamaño de las puntas de flecha (longitud del triángulo)
const ARROW_LENGTH = 0.08;
// Ancho de las puntas de flecha (mitad del ancho total)
const ARROW_HALF_WIDTH = 0.025;
// Umbral angular para detectar dirección horizontal/vertical (en radianes, ~8°)
const ALIGNMENT_THRESHOLD = Math.PI / 22;

// ─── Detección de Alineación ────────────────────────────────────────────────

/**
 * Detecta automáticamente la alineación óptima basándose en el ángulo
 * entre los dos puntos medidos en el plano XZ.
 */
export function detectAlignment(
  start: [number, number, number],
  end: [number, number, number]
): DimensionAlignment {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const angle = Math.atan2(Math.abs(dz), Math.abs(dx));

  // Casi horizontal (ángulo cerca de 0)
  if (angle < ALIGNMENT_THRESHOLD) return 'horizontal';
  // Casi vertical (ángulo cerca de π/2)
  if (angle > Math.PI / 2 - ALIGNMENT_THRESHOLD) return 'vertical';
  // Diagonal → alineado al segmento
  return 'aligned';
}

/**
 * Proyecta los puntos de medición sobre el eje de alineación.
 * Para 'horizontal': fuerza la misma Z en ambos puntos.
 * Para 'vertical': fuerza la misma X en ambos puntos.
 * Para 'aligned' y 'free': mantiene los puntos originales.
 */
export function projectToAlignment(
  start: [number, number, number],
  end: [number, number, number],
  alignment: DimensionAlignment
): { projStart: [number, number, number]; projEnd: [number, number, number] } {
  switch (alignment) {
    case 'horizontal':
      // Ambos puntos al mismo Z (el promedio o el del punto start)
      return {
        projStart: [start[0], start[1], start[2]],
        projEnd: [end[0], start[1], start[2]]
      };
    case 'vertical':
      // Ambos puntos al mismo X
      return {
        projStart: [start[0], start[1], start[2]],
        projEnd: [start[0], start[1], end[2]]
      };
    case 'aligned':
    case 'free':
    default:
      return {
        projStart: [...start] as [number, number, number],
        projEnd: [...end] as [number, number, number]
      };
  }
}

// ─── Cálculo de Distancia ───────────────────────────────────────────────────

/**
 * Calcula la distancia real entre dos puntos en 3D.
 * Precisión máxima: sin redondeo.
 */
export function calculateDimensionValue(
  start: [number, number, number],
  end: [number, number, number]
): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calcula la distancia ALINEADA (después de la proyección) entre dos puntos.
 * Esta es la distancia que se muestra en la etiqueta de la cota.
 */
export function calculateAlignedDistance(
  start: [number, number, number],
  end: [number, number, number],
  alignment: DimensionAlignment
): number {
  const { projStart, projEnd } = projectToAlignment(start, end, alignment);
  return calculateDimensionValue(projStart, projEnd);
}

// ─── Geometría Completa de la Cota ──────────────────────────────────────────

/**
 * Genera toda la geometría necesaria para renderizar una cota profesional:
 * líneas de extensión, línea base con offset, flechas, y posición del texto.
 *
 * @param start - Punto inicial medido (posición real en la escena)
 * @param end - Punto final medido
 * @param offset - Distancia perpendicular de la línea base respecto al segmento (metros)
 * @param alignment - Tipo de alineación
 */
export function calculateDimensionGeometry(
  start: [number, number, number],
  end: [number, number, number],
  offset: number,
  alignment: DimensionAlignment
): DimensionGeometry {
  // 1. Proyectar puntos según alineación
  const { projStart, projEnd } = projectToAlignment(start, end, alignment);

  // 2. Calcular dirección del segmento y perpendicular
  const dir = new THREE.Vector3(
    projEnd[0] - projStart[0],
    projEnd[1] - projStart[1],
    projEnd[2] - projStart[2]
  );
  const length = dir.length();

  // Caso degenerado: distancia cero
  if (length < 0.001) {
    const zero: [number, number, number] = [...projStart] as [number, number, number];
    return {
      baseStart: zero, baseEnd: zero,
      extStartA: zero, extEndA: zero,
      extStartB: zero, extEndB: zero,
      arrowA: [zero, zero, zero],
      arrowB: [zero, zero, zero],
      textPosition: [zero[0], zero[1] + 0.1, zero[2]],
      textRotation: 0,
      offsetDirection: [0, 0, 1]
    };
  }

  dir.normalize();

  // Perpendicular en el plano XZ (rotar 90° alrededor de Y)
  // Si la cota es vertical (dir apunta en Z), la perpendicular apunta en X
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

  // Definir el signo del offset
  const offsetVec = perp.clone().multiplyScalar(offset);

  // 3. Línea base: puntos proyectados + offset perpendicular
  const baseStart: [number, number, number] = [
    projStart[0] + offsetVec.x,
    projStart[1] + offsetVec.y + 0.002, // Elevar ligeramente para evitar z-fighting
    projStart[2] + offsetVec.z
  ];
  const baseEnd: [number, number, number] = [
    projEnd[0] + offsetVec.x,
    projEnd[1] + offsetVec.y + 0.002,
    projEnd[2] + offsetVec.z
  ];

  // 4. Líneas de extensión
  // Van desde el punto original (+ gap) hasta la línea base (+ overshoot)
  const gapVec = perp.clone().multiplyScalar(EXTENSION_GAP * Math.sign(offset));
  const overshootVec = perp.clone().multiplyScalar((Math.abs(offset) + EXTENSION_OVERSHOOT) * Math.sign(offset));

  const extStartA: [number, number, number] = [
    start[0] + gapVec.x,
    start[1] + 0.002,
    start[2] + gapVec.z
  ];
  const extEndA: [number, number, number] = [
    start[0] + overshootVec.x,
    start[1] + 0.002,
    start[2] + overshootVec.z
  ];
  const extStartB: [number, number, number] = [
    end[0] + gapVec.x,
    end[1] + 0.002,
    end[2] + gapVec.z
  ];
  const extEndB: [number, number, number] = [
    end[0] + overshootVec.x,
    end[1] + 0.002,
    end[2] + overshootVec.z
  ];

  // 5. Puntas de flecha (triángulos sólidos en los extremos de la línea base)
  const perpArrowVec = perp.clone().multiplyScalar(ARROW_HALF_WIDTH);

  // Flecha A (en baseStart, apuntando hacia baseEnd)
  const arrowATip = baseStart;
  const arrowABase1: [number, number, number] = [
    baseStart[0] + dir.x * ARROW_LENGTH + perpArrowVec.x,
    baseStart[1],
    baseStart[2] + dir.z * ARROW_LENGTH + perpArrowVec.z
  ];
  const arrowABase2: [number, number, number] = [
    baseStart[0] + dir.x * ARROW_LENGTH - perpArrowVec.x,
    baseStart[1],
    baseStart[2] + dir.z * ARROW_LENGTH - perpArrowVec.z
  ];

  // Flecha B (en baseEnd, apuntando hacia baseStart)
  const arrowBTip = baseEnd;
  const arrowBBase1: [number, number, number] = [
    baseEnd[0] - dir.x * ARROW_LENGTH + perpArrowVec.x,
    baseEnd[1],
    baseEnd[2] - dir.z * ARROW_LENGTH + perpArrowVec.z
  ];
  const arrowBBase2: [number, number, number] = [
    baseEnd[0] - dir.x * ARROW_LENGTH - perpArrowVec.x,
    baseEnd[1],
    baseEnd[2] - dir.z * ARROW_LENGTH - perpArrowVec.z
  ];

  // 6. Posición del texto (centro de la línea base, elevado ligeramente)
  const textPosition: [number, number, number] = [
    (baseStart[0] + baseEnd[0]) / 2,
    (baseStart[1] + baseEnd[1]) / 2 + 0.05,
    (baseStart[2] + baseEnd[2]) / 2
  ];

  // 7. Rotación del texto para que siga la dirección de la cota
  const textRotation = Math.atan2(dir.z, dir.x);

  return {
    baseStart,
    baseEnd,
    extStartA,
    extEndA,
    extStartB,
    extEndB,
    arrowA: [arrowATip, arrowABase1, arrowABase2],
    arrowB: [arrowBTip, arrowBBase1, arrowBBase2],
    textPosition,
    textRotation,
    offsetDirection: [perp.x, perp.y, perp.z]
  };
}

// ─── Formateo de Unidades ───────────────────────────────────────────────────

/**
 * Convierte metros a la unidad seleccionada y formatea el valor.
 * Redondea a 1 decimal para mm/cm, y 3 decimales para metros.
 */
export function formatDimensionValue(meters: number, unit: DimensionUnit): string {
  switch (unit) {
    case 'mm':
      return `${Math.round(meters * 1000)} mm`;
    case 'cm':
      return `${(meters * 100).toFixed(1)} cm`;
    case 'm':
    default:
      return `${meters.toFixed(3)} m`;
  }
}

/**
 * Convierte un valor en la unidad dada a metros.
 */
export function toMeters(value: number, unit: DimensionUnit): number {
  switch (unit) {
    case 'mm': return value / 1000;
    case 'cm': return value / 100;
    case 'm':
    default: return value;
  }
}

// ─── Offset Automático Inteligente ──────────────────────────────────────────

/**
 * Calcula un offset automático basado en el contexto.
 * Retorna un valor positivo por defecto (0.3m).
 * Puede ajustarse en base a la cercanía de otros elementos.
 */
export function calculateAutoOffset(): number {
  return 0.3;
}
