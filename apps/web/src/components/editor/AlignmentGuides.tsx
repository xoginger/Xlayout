/**
 * Creado y diseñado por XO
 */

'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import type { AlignmentGuide } from '@/utils/alignment-guides';

/**
 * Props del componente de guías de alineación visual
 */
interface AlignmentGuidesProps {
  /** Guías activas detectadas por el motor de alineación */
  guides: AlignmentGuide[];
  /** Si está activo el modo de arrastre */
  active: boolean;
}

/**
 * AlignmentGuides — Renderiza líneas de alineación visual sobre el canvas 3D.
 *
 * Dibuja líneas punteadas semitransparentes entre objetos cuando
 * se detecta una alineación de bordes o centros durante el arrastre.
 *
 * Colores:
 * - Azul (#3b82f6)   → alineación de bordes
 * - Púrpura (#a855f7) → alineación de centros
 */
export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides, active }) => {
  // No renderizar si no hay guías o no está activo
  if (!active || guides.length === 0) return null;

  return (
    <group name="alignment-guides">
      {guides.map((guide, i) => (
        <AlignmentGuideLine key={`guide-${i}-${guide.type}`} guide={guide} />
      ))}
    </group>
  );
};

/**
 * Línea individual de guía de alineación
 */
const AlignmentGuideLine: React.FC<{ guide: AlignmentGuide }> = ({ guide }) => {
  // Puntos de la línea
  const points = useMemo(() => [
    new THREE.Vector3(...guide.from),
    new THREE.Vector3(...guide.to),
  ], [guide.from, guide.to]);

  // Color basado en el tipo de guía
  const color = guide.color || '#3b82f6';

  // Punto medio para la etiqueta
  const midPoint = useMemo(() => {
    return new THREE.Vector3(
      (guide.from[0] + guide.to[0]) / 2,
      Math.max(guide.from[1], guide.to[1]) + 0.05,
      (guide.from[2] + guide.to[2]) / 2,
    );
  }, [guide.from, guide.to]);

  return (
    <group>
      {/* Línea principal de la guía */}
      <Line
        points={points}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.08}
        dashScale={1}
        gapSize={0.04}
        transparent
        opacity={0.85}
      />

      {/* Línea de respaldo más gruesa y sutil */}
      <Line
        points={points}
        color={color}
        lineWidth={4}
        transparent
        opacity={0.15}
      />

      {/* Etiqueta opcional */}
      {guide.label && (
        <Html
          position={midPoint}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 15, 20, 0.85)',
              color: color,
              border: `1px solid ${color}40`,
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: 800,
              fontFamily: 'var(--xo-font-mono, monospace)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
            }}
          >
            {guide.label}
          </div>
        </Html>
      )}
    </group>
  );
};
