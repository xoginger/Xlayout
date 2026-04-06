/**
 * Creado y diseñado por XO
 */

// @ts-nocheck — Store selectors return untyped (useShallow + any). Fix pendiente en P2 refactor.
"use client";

import React, { Suspense, useState, useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  TransformControls,
  OrthographicCamera,
  PerspectiveCamera,
  Line,
  Html,
  useTexture
} from '@react-three/drei';
import { useOptimizedModelSuspense } from '@/hooks/useOptimizedModel';
import {
  useEditorStore,
  SceneItem,
  Wall,
  DimensionLine,
  Opening,
  LineEntity,
  RectangleEntity,
  FaceEntity,
  VolumeEntity,
  Scene,
  Layer
} from '@/store/editor-store';
import {
  snapPointToGrid,
  getWallAngle,
  getWallCenter,
  calculateDistance,
  getOrthogonalPoint,
  detectClosedLoops,
  ensureCounterClockwise,
  ensureCCW2D,
  getAxisInference,
  findInference,
  SnapInference
} from '@/utils/cad-math';
import { findNearestWall } from '@/editor/utils/wall-snap';
import { findModularSnap, SnapResult } from '@/utils/snap-engine';
import { detectAlignmentGuides, type AlignmentGuide } from '@/utils/alignment-guides';
import { AlignmentGuides } from '@/components/editor/AlignmentGuides';
import { exportEngine } from '@/utils/export-engine';
import { useRadialMenu } from '@/hooks/useRadialMenu';
import { useIntentStore } from '@/intent/intent-store';
import {
  calculateDimensionGeometry,
  calculateAlignedDistance,
  detectAlignment,
  formatDimensionValue,
  calculateAutoOffset,
  type DimensionGeometry
} from '@/utils/dimension-math';
import {
  collectSnapCandidates,
  findDimensionSnap,
  snapToGridForDimension,
  type DimensionSnapResult
} from '@/utils/dimension-snap';
import * as THREE from 'three';

const RectangleObject: React.FC<{ rect: RectangleEntity }> = ({ rect }) => {
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isSelected = selectedIds.includes(rect.id);

  const points = [
    [rect.start[0], 0, rect.start[2]],
    [rect.end[0], 0, rect.start[2]],
    [rect.end[0], 0, rect.end[2]],
    [rect.start[0], 0, rect.end[2]],
    [rect.start[0], 0, rect.start[2]]
  ] as [number, number, number][];

  return (
    <group onClick={(e) => { e.stopPropagation(); select(rect.id, 'rectangle', e.shiftKey); }}>
      <Line
        points={points}
        color={isSelected ? '#3b82f6' : '#a1a1aa'}
        lineWidth={2}
      />
      <mesh 
        position={[(rect.start[0] + rect.end[0]) / 2, -0.001, (rect.start[2] + rect.end[2]) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[Math.abs(rect.width), Math.abs(rect.depth)]} />
        <meshBasicMaterial color={isSelected ? '#3b82f6' : '#27272a'} transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

const LineCADObject: React.FC<{ line: LineEntity }> = ({ line }) => {
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isSelected = selectedIds.includes(line.id);

  return (
    <group onClick={(e) => { e.stopPropagation(); select(line.id, 'line', e.shiftKey); }}>
      <Line
        points={[line.start, line.end]}
        color={isSelected ? '#3b82f6' : '#a1a1aa'}
        lineWidth={2}
      />
    </group>
  );
};

const OpeningObject: React.FC<{ opening: Opening }> = ({ opening }) => {
  const wall = useEditorStore((state) => state.walls.find(w => w.id === opening.wallId));
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isSelected = selectedIds.includes(opening.id);
  
  if (!wall) return null;

  const wallLength = calculateDistance(wall.start, wall.end);
  const wallAngle = getWallAngle(wall.start, wall.end);
  const x = (opening.offset - 0.5) * wallLength;
  const center = getWallCenter(wall.start, wall.end);

  return (
    <group 
      position={center} 
      rotation={[0, -wallAngle, 0]} 
      onClick={(e) => { e.stopPropagation(); select(opening.id, 'opening', e.shiftKey); }}
    >
      <mesh position={[x, opening.height / 2, 0]}>
        <boxGeometry args={[opening.width, opening.height, wall.thickness + 0.05]} />
        <meshStandardMaterial 
          color={opening.type === 'door' ? '#f59e0b' : '#38bdf8'} 
          transparent 
          opacity={isSelected ? 0.8 : 0.5} 
          wireframe={isSelected}
        />
      </mesh>
    </group>
  );
};

const InferenceIndicator: React.FC<{ inference: SnapInference }> = ({ inference }) => {
  if (inference.type === 'none') return null;

  return (
    <group position={inference.point}>
      {/* Pequeño cuadrado/círculo para el punto */}
      <mesh renderOrder={1000}>
        {inference.type === 'midpoint' ? <boxGeometry args={[0.06, 0.06, 0.06]} /> : <sphereGeometry args={[0.04, 8, 8]} />}
        <meshBasicMaterial color={inference.color} depthTest={false} transparent opacity={0.8} />
      </mesh>
      
      {/* Etiqueta */}
      {inference.label && (
        <Html distanceFactor={10} position={[0, 0.1, 0]}>
          <div className="bg-zinc-900 text-white text-[8px] px-1 py-0.5 rounded border border-zinc-700 whitespace-nowrap shadow-xl pointer-events-none uppercase font-black tracking-tighter">
            {inference.label}
          </div>
        </Html>
      )}
    </group>
  );
};

const SnapPointIndicator: React.FC<{ position: [number, number, number]; active: boolean }> = ({ position, active }) => (
  <mesh position={position} renderOrder={1000}>
    <sphereGeometry args={[0.04, 8, 8]} />
    <meshBasicMaterial color={active ? "#10b981" : "#3b82f6"} transparent opacity={0.6} depthTest={false} />
  </mesh>
);

class ModelErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { 
    // Capturado silenciosamente: previene la pérdida de contexto y evita polucionar la consola con 404s
  }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const ModelFallback: React.FC<{ item: SceneItem }> = ({ item }) => {
  const w = item.width || 1;
  const h = item.height || 1;
  const d = item.depth || 1;

  // Líneas punteadas de las aristas para efecto "wireframe arquitectónico"
  const edges = useMemo(() => {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    return [
      // Aristas inferiores
      [[-hw, -hh, -hd], [hw, -hh, -hd]],
      [[hw, -hh, -hd], [hw, -hh, hd]],
      [[hw, -hh, hd], [-hw, -hh, hd]],
      [[-hw, -hh, hd], [-hw, -hh, -hd]],
      // Aristas superiores
      [[-hw, hh, -hd], [hw, hh, -hd]],
      [[hw, hh, -hd], [hw, hh, hd]],
      [[hw, hh, hd], [-hw, hh, hd]],
      [[-hw, hh, hd], [-hw, hh, -hd]],
      // Aristas verticales
      [[-hw, -hh, -hd], [-hw, hh, -hd]],
      [[hw, -hh, -hd], [hw, hh, -hd]],
      [[hw, -hh, hd], [hw, hh, hd]],
      [[-hw, -hh, hd], [-hw, hh, hd]],
    ] as [[number, number, number], [number, number, number]][];
  }, [w, h, d]);

  return (
    <group position={[0, h / 2, 0]}>
      {/* Cuerpo sólido semi-transparente con patrón rayado */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#6366f1"
          roughness={0.9}
          metalness={0.0}
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Aristas punteadas — aspecto técnico/blueprint */}
      {edges.map((edge, i) => (
        <Line
          key={i}
          points={edge}
          color="#818cf8"
          lineWidth={1.2}
          dashed
          dashSize={0.05}
          gapSize={0.04}
        />
      ))}

      {/* Cara frontal con relleno distinguible */}
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      {/* Indicador visual "Sin modelo 3D" — siempre visible */}
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={6}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          userSelect: 'none',
        }}>
          {/* Ícono de cubo con signo de interrogación */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px dashed rgba(129, 140, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}>
            📦
          </div>
          {/* Etiqueta de estado */}
          <div style={{
            background: 'rgba(30, 27, 75, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '4px',
            padding: '3px 8px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              fontSize: '8px',
              fontWeight: 800,
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Sin modelo 3D
            </span>
          </div>
          {/* Nombre del producto y dimensiones */}
          {item.label && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '3px',
              padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                fontSize: '7px',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}>
                {item.label}
              </span>
            </div>
          )}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '3px',
            padding: '1px 5px',
          }}>
            <span style={{
              fontSize: '6px',
              fontWeight: 600,
              color: '#64748b',
              fontFamily: 'monospace',
            }}>
              {w.toFixed(2)}×{d.toFixed(2)}×{h.toFixed(2)}m
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
};

const GltfModel: React.FC<{ url: string; item: SceneItem }> = ({ url, item }) => {
  // Usar el loader optimizado con soporte Draco + caché LRU
  const gltf = useOptimizedModelSuspense(url);
  
  const clonedScene = useMemo(() => {
    // Clone comparte geometría y materiales por referencia (sin duplicar en GPU)
    const clone = gltf.scene.clone(true);
    
    // Aplicar transformaciones internas basadas en metadatos del modelo
    const forwardAxis = item.metadata?.forwardAxis || 'Z';
    if (forwardAxis === 'X') clone.rotation.y = -Math.PI / 2;
    if (forwardAxis === '-X') clone.rotation.y = Math.PI / 2;
    if (forwardAxis === '-Z') clone.rotation.y = Math.PI;

    // Aplicar escala a la escena misma
    clone.scale.set(item.scale[0], item.scale[1], item.scale[2]);

    // Optimizar materiales: congelar para evitar re-compilación de shaders
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        // Congelar material: Three.js no re-evaluará needsUpdate en cada frame
        const mat = child.material;
        if (mat && !mat._frozen) {
          mat.needsUpdate = false;
          mat._frozen = true;
        }
      }
    });

    // Alineación al suelo
    const box = new THREE.Box3().setFromObject(clone);
    if (box.min.y !== Infinity && box.max.y !== -Infinity) {
      clone.position.y = -box.min.y;
    }

    return clone;
  }, [gltf.scene, item.metadata?.forwardAxis, item.scale]);
  
  return <primitive object={clonedScene} />;
};

const SceneItemObject: React.FC<{ item: SceneItem }> = memo(({ item }) => {
  // Selectores finos: solo suscribir a lo necesario para evitar rerenders masivos
  const select = useEditorStore((s) => s.select);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeTool = useEditorStore((s) => s.activeTool);
  const updateItem = useEditorStore((s) => s.updateItem);
  const viewMode = useEditorStore((s) => s.viewMode);
  const gridSize = useEditorStore((s) => s.gridSize);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const items = useEditorStore((s) => s.items);
  const isSelected = selectedIds.includes(item.id);
  const [activeSnap, setActiveSnap] = useState<SnapResult | null>(null);
  const [activeAlignGuides, setActiveAlignGuides] = useState<AlignmentGuide[]>([]);
  const [isAlignActive, setIsAlignActive] = useState(false);

  // groupRef es el THREE.Group real para este objeto.
  // TransformControls usa object={groupRef} para acoplarse directamente a él,
  // así el gizmo aparece en la posición real del mundo (item.position).
  const groupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);
  // ref isDragging: sin escrituras al store durante el arrastre — corrección de bucle de crash.
  const isDragging = useRef(false);
  // Ref para throttle de actualización en tiempo real durante arrastre (~30fps)
  const liveUpdateRAF = useRef<number | null>(null);

  /** Actualización en tiempo real durante arrastre — refleja X/Z en el inspector contextual */
  const handleTransformChange = useCallback(() => {
    if (!isDragging.current || !groupRef.current) return;
    // Throttle: solo un RAF activo a la vez
    if (liveUpdateRAF.current !== null) return;
    liveUpdateRAF.current = requestAnimationFrame(() => {
      liveUpdateRAF.current = null;
      const g = groupRef.current;
      if (!g) return;
      
      const pos: [number, number, number] = [g.position.x, g.position.y, g.position.z];
      const rot: [number, number, number] = [g.rotation.x, g.rotation.y, g.rotation.z];
      
      // Detectar guías de alineación en tiempo real para feedback visual inmediato
      const otherItems = items.filter(it => it.id !== item.id);
      const alignResult = detectAlignmentGuides(
        { ...item, position: pos },
        otherItems,
        0.05 // Umbral un poco más amplio durante arrastre para anticipar el snap
      );
      setActiveAlignGuides(alignResult.guides);
      setIsAlignActive(alignResult.guides.length > 0);
      
      // Escritura ligera al store — actualiza solo posición y rotación para que el inspector reaccione
      updateItem(item.id, { position: pos, rotation: rot });
    });
  }, [item.id, item, items, updateItem]);

  const commitTransform = () => {
    const group = groupRef.current;
    if (!group) return;

    const pos = group.position;
    const rot = group.rotation;
    const scale = group.scale;

    // Ajuste de Suelo Suave: evita enviar objetos al vacío, pero permite colocación en 0 sin rebotar.
    let safeY = pos.y < 0 ? 0 : pos.y;

    let finalX = pos.x;
    let finalZ = pos.z;

    // 1. Ajuste Modular (Prioridad) — evaluado solo al soltar
    const modularSnap = findModularSnap(item, items, 0.15);
    if (modularSnap) {
      finalX = modularSnap.snappedPosition[0];
      safeY = modularSnap.snappedPosition[1];
      finalZ = modularSnap.snappedPosition[2];
      setActiveSnap(modularSnap);
    } else {
      setActiveSnap(null);
      // 2. Ajuste de Rejilla (Fallback) — solo cuando el ajuste nativo de Three.js está desactivado
      if (snapEnabled && activeTool === 'move' && !(transformRef.current?.translationSnap)) {
        finalX = Math.round(pos.x / gridSize) * gridSize;
        finalZ = Math.round(pos.z / gridSize) * gridSize;
      }
    }

    // Corrección de ajuste: empujar la posición final ajustada de vuelta al objeto de Three.js
    // para que el gizmo esté alineado tras el commit (antes de la reconciliación de React)

    // 3. Guías de alineación: detectar alineamiento con otros objetos
    const otherItems = items.filter(it => it.id !== item.id);
    const alignResult = detectAlignmentGuides(
      { ...item, position: [finalX, safeY, finalZ] },
      otherItems
    );

    if (alignResult.snappedPosition) {
      finalX = alignResult.snappedPosition[0];
      finalZ = alignResult.snappedPosition[2];
    }

    // Actualizar guías visuales (se limpian tras un breve delay)
    setActiveAlignGuides(alignResult.guides);
    setIsAlignActive(alignResult.guides.length > 0);
    if (alignResult.guides.length > 0) {
      setTimeout(() => { setActiveAlignGuides([]); setIsAlignActive(false); }, 1500);
    }

    group.position.set(finalX, safeY, finalZ);

    // Escritura única al store — ocurre solo al terminar el arrastre
    updateItem(item.id, {
      position: [finalX, safeY, finalZ],
      rotation: [rot.x, rot.y, rot.z],
      scale: [scale.x, scale.y, scale.z],
    });
  };

  // Auto-Gizmo Profesional: Mostrar siempre si está seleccionado. Por defecto modo traslación salvo rotación/escala explícita.
  const mode = activeTool === 'rotate' ? 'rotate' : activeTool === 'scale' ? 'scale' : 'translate';
  const showGizmo = isSelected && selectedIds.length === 1;



  return (
    <>
      {/*
        El grupo SIEMPRE se renderiza en la escena en item.position.
        Cuando TransformControls está activo usa object={groupRef} para acoplarse
        directamente a este grupo — el gizmo aparece en su posición real.
        No envolvemos este grupo dentro de los hijos de TransformControls para evitar el
        error de drie del wrapper interno en el origen.
      */}
      <group
        ref={groupRef}
        position={item.position}
        rotation={item.rotation}
        onClick={(e) => { e.stopPropagation(); select(item.id, 'item', e.shiftKey); }}
      >
        <ModelErrorBoundary fallback={<ModelFallback item={item} />}>
          <Suspense fallback={<ModelFallback item={item} />}>
            {item.model3dUrl ? (
              <GltfModel url={item.model3dUrl} item={item} />
            ) : (
              <ModelFallback item={item} />
            )}
          </Suspense>
        </ModelErrorBoundary>

        {/* Visualizadores para los Snap Points */}
        {isSelected && item.snapPoints?.map(sp => (
          <SnapPointIndicator
            key={sp.id}
            position={sp.localPosition}
            active={activeSnap?.movingSnapPoint.id === sp.id}
          />
        ))}

        {viewMode === '2D' && item.label && (
          <Html position={[0, item.height + 0.12, 0]} center>
            <div className={`text-[7px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded shadow whitespace-nowrap ${
              isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 text-zinc-100'
            }`}>
              {item.label}
            </div>
          </Html>
        )}

        {viewMode === '2D' && (
          <Line
            points={[
              [-item.width/2, 0.001, -item.depth/2],
              [ item.width/2, 0.001, -item.depth/2],
              [ item.width/2, 0.001,  item.depth/2],
              [-item.width/2, 0.001,  item.depth/2],
              [-item.width/2, 0.001, -item.depth/2],
            ]}
            color={isSelected ? '#3b82f6' : '#475569'}
            lineWidth={isSelected ? 2 : 1.2}
          />
        )}
      </group>

      {showGizmo && (
        <TransformControls
          ref={transformRef}
          object={groupRef}
          mode={mode as any}
          onChange={handleTransformChange}
          onMouseDown={() => {
            isDragging.current = true;
            setActiveAlignGuides([]);
            setIsAlignActive(false);
            useEditorStore.getState().saveToHistory();
            /* Señal para el Intent Engine (Fase 4) */
            useIntentStore.getState().setGizmoActive(true);
          }}
          onMouseUp={() => {
            isDragging.current = false;
            // Cancelar cualquier RAF pendiente antes de commit final
            if (liveUpdateRAF.current !== null) {
              cancelAnimationFrame(liveUpdateRAF.current);
              liveUpdateRAF.current = null;
            }
            commitTransform();
            /* Señal para el Intent Engine (Fase 4) */
            useIntentStore.getState().setGizmoActive(false);
          }}
          translationSnap={snapEnabled && mode === 'translate' ? gridSize : null}
          rotationSnap={snapEnabled && mode === 'rotate' ? Math.PI / 36 : null}
          size={0.75}
        />
      )}

      {/* Guías de alineación visual */}
      <AlignmentGuides guides={activeAlignGuides} active={isAlignActive} />
    </>
  );
});
SceneItemObject.displayName = 'SceneItemObject';

// ─── Componente Profesional de Cota (CAD-grade) ─────────────────────────────
const DimensionLineObject: React.FC<{ dim: DimensionLine; isPreview?: boolean }> = memo(({ dim, isPreview = false }) => {
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isSelected = !isPreview && selectedIds.includes(dim.id);

  // Calcular geometría completa de la cota
  const geometry = useMemo(() => {
    return calculateDimensionGeometry(dim.start, dim.end, dim.offset || 0.3, dim.alignment || 'aligned');
  }, [dim.start, dim.end, dim.offset, dim.alignment]);

  // Calcular distancia alineada para mostrar
  const displayValue = useMemo(() => {
    const dist = dim.value || calculateAlignedDistance(dim.start, dim.end, dim.alignment || 'aligned');
    return formatDimensionValue(dist, dim.unit || 'm');
  }, [dim.start, dim.end, dim.value, dim.unit, dim.alignment]);

  // Colores profesionales
  const lineColor = isPreview ? '#60a5fa' : (isSelected ? '#2563eb' : '#3b82f6');
  const extColor = isPreview ? '#93c5fd' : (isSelected ? '#3b82f6' : '#60a5fa');
  const arrowColor = isPreview ? '#60a5fa' : (isSelected ? '#1d4ed8' : '#2563eb');
  const opacity = isPreview ? 0.6 : 1.0;

  // Geometría de las flechas (triángulos sólidos)
  const arrowGeoA = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      ...geometry.arrowA[0], ...geometry.arrowA[1], ...geometry.arrowA[2]
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }, [geometry.arrowA]);

  const arrowGeoB = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      ...geometry.arrowB[0], ...geometry.arrowB[1], ...geometry.arrowB[2]
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }, [geometry.arrowB]);

  return (
    <group
      onClick={isPreview ? undefined : (e) => { e.stopPropagation(); select(dim.id, 'dimension', e.shiftKey); }}
    >
      {/* Línea base principal (con offset) */}
      <Line
        points={[geometry.baseStart, geometry.baseEnd]}
        color={lineColor}
        lineWidth={isSelected ? 2.5 : 2}
        transparent
        opacity={opacity}
      />

      {/* Líneas de extensión A y B */}
      <Line
        points={[geometry.extStartA, geometry.extEndA]}
        color={extColor}
        lineWidth={1}
        transparent
        opacity={opacity * 0.8}
      />
      <Line
        points={[geometry.extStartB, geometry.extEndB]}
        color={extColor}
        lineWidth={1}
        transparent
        opacity={opacity * 0.8}
      />

      {/* Puntas de flecha (triángulos rellenos) */}
      <mesh geometry={arrowGeoA} renderOrder={999}>
        <meshBasicMaterial color={arrowColor} side={THREE.DoubleSide} transparent opacity={opacity} depthTest={false} />
      </mesh>
      <mesh geometry={arrowGeoB} renderOrder={999}>
        <meshBasicMaterial color={arrowColor} side={THREE.DoubleSide} transparent opacity={opacity} depthTest={false} />
      </mesh>

      {/* Marcadores en los puntos medidos (círculos pequeños) */}
      {!isPreview && (
        <>
          <mesh position={dim.start} renderOrder={1000}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color={lineColor} depthTest={false} transparent opacity={opacity} />
          </mesh>
          <mesh position={dim.end} renderOrder={1000}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color={lineColor} depthTest={false} transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {/* Etiqueta de medida */}
      <Html position={geometry.textPosition} center scale={0.5} style={{ pointerEvents: isPreview ? 'none' : 'auto' }}>
        <div
          className={`px-2 py-1 rounded-md text-[9px] font-mono font-black whitespace-nowrap shadow-xl transition-all ${
            isSelected
              ? 'bg-blue-600 text-white border border-blue-500 ring-2 ring-blue-400/30'
              : isPreview
                ? 'bg-zinc-800/80 text-blue-300 border border-zinc-700/50'
                : 'bg-zinc-900 text-blue-400 border border-zinc-800 ring-1 ring-blue-500/20 hover:ring-blue-400/40'
          }`}
        >
          {displayValue}
        </div>
      </Html>

      {/* Highlight de selección (marco expandido sobre la línea base) */}
      {isSelected && (
        <Line
          points={[geometry.baseStart, geometry.baseEnd]}
          color="#93c5fd"
          lineWidth={6}
          transparent
          opacity={0.15}
        />
      )}
    </group>
  );
});
DimensionLineObject.displayName = 'DimensionLineObject';

const WallObject: React.FC<{ wall: Wall }> = ({ wall }) => {
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const viewMode = useEditorStore((state) => state.viewMode);
  const isSelected = selectedIds.includes(wall.id);

  const length = calculateDistance(wall.start, wall.end);
  const angle = getWallAngle(wall.start, wall.end);
  const center = getWallCenter(wall.start, wall.end);

  if (viewMode === '2D') {
    return (
      <group position={center as any} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall', e.shiftKey); }}>
        <mesh position={[0, 0.001, 0]}>
          <boxGeometry args={[length, 0.002, wall.thickness]} />
          <meshBasicMaterial color={isSelected ? '#3b82f6' : '#27272a'} />
        </mesh>
        <Line 
          points={[[-length/2, 0.002, wall.thickness/2], [length/2, 0.002, wall.thickness/2], [length/2, 0.002, -wall.thickness/2], [-length/2, 0.002, -wall.thickness/2], [-length/2, 0.002, wall.thickness/2]]} 
          color={isSelected ? '#60a5fa' : '#52525b'} 
          lineWidth={isSelected ? 2 : 1.5} 
        />
      </group>
    );
  }

  return (
    <group position={center as any} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall', e.shiftKey); }}>
      <mesh position={[0, wall.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, wall.height, wall.thickness]} />
        <meshStandardMaterial 
          color={isSelected ? '#3b82f6' : '#64748b'}
          metalness={0.04} 
          roughness={0.88} 
        />
      </mesh>
    </group>
  );
};

const HUD: React.FC<{ 
  point: [number, number, number]; 
  start?: [number, number, number] | null; 
  tool: string;
  vcbValue: string;
  activeInference: SnapInference;
}> = ({ point, start, tool, vcbValue, activeInference }) => {
  // Solo mostrar VCB si se está midiendo, dibujando o escribiendo explícitamente
  const isActive = start !== null || vcbValue !== '' || ['wall', 'line', 'rectangle', 'dimension', 'circle', 'scale-blueprint'].includes(tool);
  if (!isActive) return null;

  const distance = start ? calculateDistance(start, point) : 0;
  
  return (
    <>
      {/* 2. VCB Fijo (Estilo SketchUp) */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 p-2">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-lg overflow-hidden flex divide-x divide-zinc-100 min-w-[120px] ring-1 ring-black/5">
            <div className="px-3 py-2 bg-zinc-50 flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Medida</span>
            </div>
            <div className="px-4 py-2 flex items-center bg-white min-w-[80px]">
              <span className="text-sm font-mono font-bold text-zinc-800">
                {vcbValue || (start ? distance.toFixed(3) : "0.000")}
              </span>
              <span className="ml-1 text-[10px] text-zinc-400 font-bold">m</span>
              {vcbValue && <div className="ml-2 w-1.5 h-4 bg-blue-500 animate-pulse rounded-full" />}
            </div>
          </div>
        </div>
      </Html>
    </>
  );
};

const FaceObject: React.FC<{ face: FaceEntity }> = ({ face }) => {
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isSelected = selectedIds.includes(face.id);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (face.points.length < 3) return s;
    // Map XZ to Local XY (Y = -Z to match -PI/2 rotation)
    // Then ensure CCW in local space so normal points Z+ (World Y+)
    const localPoints = ensureCCW2D(face.points.map(p => [p[0], -p[2]]));
    
    s.moveTo(localPoints[0][0], localPoints[0][1]);
    for (let i = 1; i < localPoints.length; i++) {
      s.lineTo(localPoints[i][0], localPoints[i][1]);
    }
    s.closePath();
    return s;
  }, [face.points]);

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.0005, 0]}
      onClick={(e) => { e.stopPropagation(); select(face.id, 'face', e.shiftKey); }}
    >
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial 
        color={isSelected ? '#3b82f6' : '#94a3b8'} 
        transparent 
        opacity={isSelected ? 0.4 : 0.2} 
      />
    </mesh>
  );
};

const VolumeObject: React.FC<{ volume: VolumeEntity }> = ({ volume }) => {
  const select = useEditorStore((s) => s.select);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeTool = useEditorStore((s) => s.activeTool);
  const updateVolume = useEditorStore((s) => s.updateVolume);
  const isSelected = selectedIds.includes(volume.id);
  const volumeGroupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);
  const isDraggingVol = useRef(false);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (volume.basePoints.length < 3) return s;
    // Map XZ to Local XY (Y = -Z to match -PI/2 rotation)
    // Then ensure CCW in local space so normal points Z+ (World Y+)
    const localPoints = ensureCCW2D(volume.basePoints.map(p => [p[0], -p[2]]));

    s.moveTo(localPoints[0][0], localPoints[0][1]);
    for (let i = 1; i < localPoints.length; i++) {
      s.lineTo(localPoints[i][0], localPoints[i][1]);
    }
    s.closePath();
    return s;
  }, [volume.basePoints]);

  const commitVolumeTransform = () => {
    const group = volumeGroupRef.current;
    if (!group) return;
    const { position } = group;
    updateVolume(volume.id, { position: [position.x, position.y, position.z] });
  };

  return (
    <>
      {/* Group always in scene; object={volumeGroupRef} on TransformControls
          ensures the gizmo attaches to the real world position, not origin. */}
      <group
        ref={volumeGroupRef}
        position={volume.position}
        onClick={(e) => { e.stopPropagation(); select(volume.id, 'volume', e.shiftKey); }}
      >
        <mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <extrudeGeometry
            args={[shape, { depth: volume.height, bevelEnabled: false }]}
          />
          <meshStandardMaterial
            color={isSelected ? '#3b82f6' : '#64748b'}
            metalness={0.1}
            roughness={0.7}
            transparent
            opacity={isSelected ? 0.8 : 0.6}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <extrudeGeometry args={[shape, { depth: volume.height, bevelEnabled: false }]} />
          <meshBasicMaterial color={isSelected ? '#93c5fd' : '#475569'} wireframe />
        </mesh>
      </group>

      {isSelected && (
        <TransformControls
          ref={transformRef}
          object={volumeGroupRef}
          mode="translate"
          onMouseDown={() => {
            isDraggingVol.current = true;
            useEditorStore.getState().saveToHistory();
          }}
          onMouseUp={() => {
            isDraggingVol.current = false;
            commitVolumeTransform();
          }}
        />
      )}
    </>
  );
};


const BlueprintRenderer: React.FC<{ blueprint: any; onPointerDown?: any; onPointerMove?: any }> = ({ blueprint, onPointerDown, onPointerMove }) => {
  const texture = useTexture(blueprint.url) as any;
  const { width, height } = texture.image;
  const aspect = width / height;
  
  const baseWidth = 10 * blueprint.scale;
  const baseHeight = baseWidth / aspect;

  return (
    <mesh 
      position={blueprint.position} 
      rotation={[-Math.PI / 2, 0, blueprint.rotation]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <planeGeometry args={[baseWidth, baseHeight]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={blueprint.opacity} 
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const BlueprintObject: React.FC<{ onPointerDown?: any; onPointerMove?: any }> = ({ onPointerDown, onPointerMove }) => {
  const blueprint = useEditorStore((s) => s.blueprint);
  if (!blueprint.url || !blueprint.visible) return null;

  return (
    <Suspense fallback={null}>
      <BlueprintRenderer blueprint={blueprint} onPointerDown={onPointerDown} onPointerMove={onPointerMove} />
    </Suspense>
  );
};

const ExportManager: React.FC = () => {
  const { gl, scene, camera } = useThree();
  const exportRequest = useEditorStore((s) => s.exportRequest);
  const clearExportRequest = useEditorStore((s) => s.clearExportRequest);
  const project = useEditorStore((s) => s.project);
  const items = useEditorStore((s) => s.items);

  useEffect(() => {
    if (!exportRequest) return;

    const runExport = async () => {
      try {
        if (exportRequest === 'image') {
          await exportEngine.exportImage(gl, scene, camera, project.name);
        } else if (exportRequest === 'glb') {
          await exportEngine.exportGLB(scene, project.name);
        } else if (exportRequest === 'pdf') {
          await exportEngine.exportPDF(gl, scene, camera, project, items);
        }
      } catch (err) {
        console.error('Export failed', err);
      } finally {
        clearExportRequest();
      }
    };

    runExport();
  }, [exportRequest, gl, scene, camera, project, items, clearExportRequest]);

  return null;
};

// ─── Grid Helper for 3D mode ─────────────────────────────────────────────────
// Siempre visible en la vista 3D independientemente del estado de la rejilla.
const Grid3DHelper: React.FC<{ gridSize: number }> = ({ gridSize }) => {
  const size = 50;
  const divisions = Math.round(size / gridSize);

  return (
    <>
      <gridHelper
        args={[size, divisions, '#94a3b8', '#e2e8f0']}
        position={[0, 0, 0]}
      />
      {/* Very subtle floor plane for depth reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </>
  );
};

// ─── Caja delimitadora visual de selección ────────────────────────────────────
const SelectionBoundingBox: React.FC = () => {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const items = useEditorStore((s) => s.items);
  const walls = useEditorStore((s) => s.walls);

  const box = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        const hw = item.width / 2, hd = item.depth / 2;
        for (let dx of [-hw, hw]) {
          for (let dz of [-hd, hd]) {
            const x = item.position[0] + dx;
            const z = item.position[2] + dz;
            min[0] = Math.min(min[0], x);
            min[2] = Math.min(min[2], z);
            max[0] = Math.max(max[0], x);
            max[2] = Math.max(max[2], z);
          }
        }
        min[1] = Math.min(min[1], item.position[1]);
        max[1] = Math.max(max[1], item.position[1] + item.height);
      }
      const wall = walls.find(w => w.id === id);
      if (wall) {
        for (const p of [wall.start, wall.end]) {
          for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
        }
        max[1] = Math.max(max[1], wall.height);
      }
    });

    if (min[0] === Infinity) return null;
    return { min, max };
  }, [selectedIds, items, walls]);

  if (!box || selectedIds.length < 2) return null;

  const cx = (box.min[0] + box.max[0]) / 2;
  const cy = (box.min[1] + box.max[1]) / 2;
  const cz = (box.min[2] + box.max[2]) / 2;
  const sx = box.max[0] - box.min[0] + 0.1;
  const sy = box.max[1] - box.min[1] + 0.1;
  const sz = box.max[2] - box.min[2] + 0.1;

  return (
    <mesh position={[cx, cy, cz]}>
      <boxGeometry args={[sx, sy, sz]} />
      <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.3} />
    </mesh>
  );
};

const MultiSelectionGizmo: React.FC = () => {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const items = useEditorStore((s) => s.items);
  const walls = useEditorStore((s) => s.walls);
  const lines = useEditorStore((s) => s.lines);
  const rectangles = useEditorStore((s) => s.rectangles);
  const activeTool = useEditorStore((s) => s.activeTool);
  const updateItem = useEditorStore((s) => s.updateItem);
  const updateWall = useEditorStore((s) => s.updateWall);
  const updateLine = useEditorStore((s) => s.updateLine);
  const updateRectangle = useEditorStore((s) => s.updateRectangle);
  const gridSize = useEditorStore((s) => s.gridSize);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const groupRef = useRef<THREE.Group>(null!);
  const [center, setCenter] = useState<[number, number, number]>([0, 0, 0]);
  const isDragging = useRef(false);

  // Calcular centro de masa / centro de caja delimitadora
  useEffect(() => {
    if (selectedIds.length <= 1) return;

    const points: [number, number, number][] = [];
    selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) points.push(item.position);
      const wall = walls.find(w => w.id === id);
      if (wall) {
        points.push(wall.start);
        points.push(wall.end);
      }
      const line = lines.find(l => l.id === id);
      if (line) {
        points.push(line.start);
        points.push(line.end);
      }
      const rect = rectangles.find(r => r.id === id);
      if (rect) {
        points.push(rect.start);
        points.push(rect.end);
      }
    });

    if (points.length === 0) return;

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    points.forEach(p => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i]);
        max[i] = Math.max(max[i], p[i]);
      }
    });

    const newCenter: [number, number, number] = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    ];

    setCenter(newCenter);
    if (groupRef.current) {
       groupRef.current.position.set(...newCenter);
    }
  }, [selectedIds, items, walls, lines, rectangles]);

  const onDragStart = () => {
    isDragging.current = true;
    useEditorStore.getState().saveToHistory();
  };

  const onDragEnd = () => {
    isDragging.current = false;
    const offset = groupRef.current.position.clone().sub(new THREE.Vector3(...center));
    
    selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        const newPos: [number, number, number] = [
          item.position[0] + offset.x,
          item.position[1] + offset.y,
          item.position[2] + offset.z
        ];
        updateItem(id, { position: newPos });
      }
      const wall = walls.find(w => w.id === id);
      if (wall) {
        updateWall(id, {
          start: [wall.start[0] + offset.x, wall.start[1] + offset.y, wall.start[2] + offset.z],
          end: [wall.end[0] + offset.x, wall.end[1] + offset.y, wall.end[2] + offset.z]
        });
      }
      const line = lines.find(l => l.id === id);
      if (line) {
        updateLine(id, {
          start: [line.start[0] + offset.x, line.start[1] + offset.y, line.start[2] + offset.z],
          end: [line.end[0] + offset.x, line.end[1] + offset.y, line.end[2] + offset.z]
        });
      }
      const rect = rectangles.find(r => r.id === id);
      if (rect) {
        updateRectangle(id, {
          start: [rect.start[0] + offset.x, rect.start[1] + offset.y, rect.start[2] + offset.z],
          end: [rect.end[0] + offset.x, rect.end[1] + offset.y, rect.end[2] + offset.z]
        });
      }
    });
    
    setCenter([groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z]);
  };

  if (selectedIds.length <= 1 || !['move', 'select', 'pan'].includes(activeTool)) return null;

  return (
    <>
      <group ref={groupRef} position={center} />
      <TransformControls
        object={groupRef}
        mode="translate"
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
        translationSnap={snapEnabled ? gridSize : null}
        size={0.75}
      />
    </>
  );
};

export const Viewport: React.FC = () => {
  const { 
    items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, 
    select, activeTool, viewMode, selectedIds,
    addWall, addDimension, addOpening, addLine, addRectangle, addFace, addVolume,
    updateWall, updateLine, updateRectangle, updateItem,
    gridSize, snapEnabled, showGrid,
    pendingOpeningType, insertStructuralAsset, setPendingOpeningType,
    blueprint, updateBlueprint, setActiveTool,
    guides, addGuide, removeGuide, clearGuides,
    duplicateItem, removeItem
  } = useEditorStore(useShallow((s: any) => ({
    items: s.items, walls: s.walls, openings: s.openings, dimensions: s.dimensions, lines: s.lines, rectangles: s.rectangles, faces: s.faces, volumes: s.volumes, layers: s.layers, 
    select: s.select, activeTool: s.activeTool, viewMode: s.viewMode, selectedIds: s.selectedIds,
    addWall: s.addWall, addDimension: s.addDimension, addOpening: s.addOpening, addLine: s.addLine, addRectangle: s.addRectangle, addFace: s.addFace, addVolume: s.addVolume,
    updateWall: s.updateWall, updateLine: s.updateLine, updateRectangle: s.updateRectangle, updateItem: s.updateItem,
    gridSize: s.gridSize, snapEnabled: s.snapEnabled, showGrid: s.showGrid,
    pendingOpeningType: s.pendingOpeningType, insertStructuralAsset: s.insertStructuralAsset, setPendingOpeningType: s.setPendingOpeningType,
    blueprint: s.blueprint, updateBlueprint: s.updateBlueprint, setActiveTool: s.setActiveTool,
    guides: s.guides, addGuide: s.addGuide, removeGuide: s.removeGuide, clearGuides: s.clearGuides,
    duplicateItem: s.duplicateItem, removeItem: s.removeItem
  })));

  const [drawingStart, setDrawingStart] = useState<[number, number, number] | null>(null);
  const [mousePos, setMousePos] = useState<[number, number, number]>([0,0,0]);
  const [activeInference, setActiveInference] = useState<SnapInference>({ point: [0,0,0], type: 'none', color: '#ffffff' });
  const [lockedAxis, setLockedAxis] = useState<'x' | 'y' | 'z' | null>(null);
  const [highlightedWallId, setHighlightedWallId] = useState<string | null>(null);
  const [extrudingFaceId, setExtrudingFaceId] = useState<string | null>(null);
  const [extrusionHeight, setExtrusionHeight] = useState<number>(0);
  // Para extrusión: rastrear Y de pantalla al empezar arrastre para calcular delta vertical
  const extrudeStartScreenY = useRef<number | null>(null);
  const extrudeBaseHeight = useRef<number>(0.1);
  const [vcbInput, setVcbInput] = useState('');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [transformStart, setTransformStart] = useState<[number, number, number] | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [dimensionSnap, setDimensionSnap] = useState<DimensionSnapResult | null>(null);
  
  // Candidatos de snap pre-calculados para la herramienta de acotado
  const dimensionSnapCandidates = useMemo(() => {
    if (activeTool !== 'dimension') return [];
    return collectSnapCandidates(walls, items, lines, rectangles);
  }, [activeTool, walls, items, lines, rectangles]);
  const allSegments = useMemo(() => {
    // Recolectar todos los segmentos geométricos para el ajuste (snap)
    const segs: { start: [number, number, number], end: [number, number, number] }[] = [];
    
    walls.forEach((w: any) => segs.push({ start: w.start, end: w.end }));
    lines.forEach((l: any) => segs.push({ start: l.start, end: l.end }));
    rectangles.forEach((r: any) => {
      const p1 = [r.start[0], 0, r.start[2]] as [number, number, number];
      const p2 = [r.start[0] + r.width, 0, r.start[2]] as [number, number, number];
      const p3 = [r.start[0] + r.width, 0, r.start[2] + r.depth] as [number, number, number];
      const p4 = [r.start[0], 0, r.start[2] + r.depth] as [number, number, number];
      segs.push({ start: p1, end: p2 }, { start: p2, end: p3 }, { start: p3, end: p4 }, { start: p4, end: p1 });
    });

    // También incluir puntos de ajuste de los objetos de la escena
    items.forEach((item: any) => {
      if (item.snapPoints) {
        item.snapPoints.forEach((sp: any) => {
          const worldPos = new THREE.Vector3(...sp.localPosition)
            .multiply(new THREE.Vector3(...item.scale))
            .applyEuler(new THREE.Euler(...item.rotation))
            .add(new THREE.Vector3(...item.position))
            .toArray() as [number, number, number];
          // Tratamos los puntos de ajuste como segmentos de longitud cero para el ajuste de extremos
          segs.push({ start: worldPos, end: worldPos });
        });
      }
    });

    return segs;
  }, [walls, lines, rectangles, items]);

  const confirmVCB = (value: number) => {
    if (!drawingStart) return;
    
    // La dirección es desde el ratón al inicio, o a lo largo del eje de inferencia activo
    const currentPoint = activeInference.type !== 'none' ? activeInference.point : mousePos;
    const dir = new THREE.Vector3().fromArray(currentPoint).sub(new THREE.Vector3().fromArray(drawingStart)).normalize();
    
    // Si no hay dirección clara aún, y hay un bloqueo de eje, usar ese eje
    if (dir.lengthSq() < 0.0001 && lockedAxis) {
      if (lockedAxis === 'x') dir.set(1, 0, 0);
      else if (lockedAxis === 'y') dir.set(0, 1, 0);
      else if (lockedAxis === 'z') dir.set(0, 0, 1);
    }
    
    const newPointArr = new THREE.Vector3().fromArray(drawingStart).add(dir.multiplyScalar(value)).toArray() as [number, number, number];
    
    const fakeEvent = { 
      button: 0, 
      forcedPoint: newPointArr,
      point: { x: newPointArr[0], y: newPointArr[1], z: newPointArr[2] }
    };
    handlePointerDown(fakeEvent);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        if (activeInference.type === 'axis' && activeInference.axis) {
          setLockedAxis(activeInference.axis);
        }
      }

      // Input Numérico
      if (/^[0-9.]$/.test(e.key)) {
        setVcbInput(prev => prev + e.key);
        return;
      }
      if (e.key === 'Backspace') {
        setVcbInput(prev => prev.slice(0, -1));
        return;
      }
      if (e.key === 'Enter' && vcbInput) {
        confirmVCB(parseFloat(vcbInput));
        setVcbInput('');
        return;
      }

      if (e.key === 'Escape') {
        if (vcbInput) {
          setVcbInput('');
        } else if (lockedAxis) {
          setLockedAxis(null);
        } else if (drawingStart) {
          setDrawingStart(null);
        } else {
          select(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setLockedAxis(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [drawingStart, vcbInput, mousePos, activeInference, lockedAxis]);

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return;
    
    // -----------------------------------------------------------------
    // 🚧 CALIBRATOR OVERRIDE: Strict absolute precision on Blueprint
    // -----------------------------------------------------------------
    if (activeTool === 'scale-blueprint') {
      e.stopPropagation(); // Ignorar suelo y objetos inferiores
      const exactPoint = [e.point.x, e.point.y, e.point.z] as [number, number, number];
      const localVec = e.object.worldToLocal(e.point.clone());
      const localPoint = [localVec.x, localVec.y, localVec.z] as [number, number, number];

      const store = useEditorStore.getState();
      const { calibrationState, setCalibrationState } = store;

      // Clic 1
      if (!drawingStart || calibrationState.step === 'idle' || calibrationState.step === 'awaiting-first-point') {
        setDrawingStart(exactPoint); // World pos para dibujar Línea temporal
        setCalibrationState({ step: 'awaiting-second-point', pointA: localPoint });
      } 
      // Clic 2
      else if (calibrationState.step === 'awaiting-second-point') {
        const measuredDist = calculateDistance(drawingStart, exactPoint);
        setCalibrationState({ 
          step: 'awaiting-real-distance', 
          pointB: localPoint,
          measuredDistance: measuredDist
        });
        setMousePos(exactPoint); // Congelar línea
      }
      
      return; // Finalizar pronto. Pureza matemática alcanzada.
    }
    // -----------------------------------------------------------------

    let point: [number, number, number] = e.forcedPoint || activeInference.point;
    
    // Fallback de ajuste a rejilla si no hay inferencia geométrica
    if (snapEnabled && activeInference.type === 'none') {
      point = snapPointToGrid(point, gridSize);
    }

    if (activeTool === 'wall') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        if (calculateDistance(drawingStart, point) > 0.05) {
          const id = Math.random().toString(36).substr(2, 9);
          addWall({ id, start: drawingStart, end: point, thickness: 0.15, height: 2.70 });
          setDrawingStart(point);
        }
      }
    } else if (activeTool === 'line') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        if (calculateDistance(drawingStart, point) > 0.001) {
          const newLine: LineEntity = { 
            id: Math.random().toString(36).substr(2, 9), 
            start: drawingStart, 
            end: point, 
            type: 'line' 
          };
          addLine(newLine);
          
          // Estilo SketchUp: Detectar bucles cerrados
          const allLineSegments = [...lines, newLine].map(l => ({ start: l.start, end: l.end }));
          const loops = detectClosedLoops(allLineSegments);
          
          loops.forEach(loopPoints => {
            const faceId = 'face-' + Math.random().toString(36).substr(2, 5);
            addFace({ id: faceId, points: loopPoints, type: 'face' });
          });

          setDrawingStart(point); // Cadena continua
          setLockedAxis(null); // Liberar bloqueo tras clic
        }
      }
    } else if (activeTool === 'rectangle') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const width = point[0] - drawingStart[0];
        const depth = point[2] - drawingStart[2];
        const id = Math.random().toString(36).substr(2, 9);
        addRectangle({ id, start: drawingStart, end: point, width, depth, type: 'rectangle' });
        
        const rectPoints: [number, number, number][] = ensureCounterClockwise([
          [drawingStart[0], 0, drawingStart[2]],
          [drawingStart[0] + width, 0, drawingStart[2]],
          [drawingStart[0] + width, 0, drawingStart[2] + depth],
          [drawingStart[0], 0, drawingStart[2] + depth]
        ]);
        addFace({ id: 'face-' + id, points: rectPoints, type: 'face' });
        setDrawingStart(null);
      }
    } else if (activeTool === 'dimension') {
      // Usar el punto de snap especializado si está disponible
      const dimPoint = dimensionSnap ? dimensionSnap.point : point;
      if (!drawingStart) {
        setDrawingStart(dimPoint);
      } else {
        // Calcular alineación automática y distancia precisa
        const alignment = detectAlignment(drawingStart, dimPoint);
        const value = calculateAlignedDistance(drawingStart, dimPoint, alignment);
        const offset = calculateAutoOffset();

        addDimension({
          id: Math.random().toString(36).substr(2, 9),
          start: drawingStart,
          end: dimPoint,
          value,
          unit: 'mm',
          offset,
          alignment
        });
        setDrawingStart(null);
      }
    } else if (activeTool === 'circle') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const radius = calculateDistance(drawingStart, point);
        const segments = 32;
        const circlePoints: [number, number, number][] = [];
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          circlePoints.push([
            drawingStart[0] + Math.cos(angle) * radius,
            0,
            drawingStart[2] + Math.sin(angle) * radius
          ]);
        }
        addFace({ id: 'circle-' + Math.random().toString(36).substr(2, 5), points: ensureCounterClockwise(circlePoints), type: 'face' });
        setDrawingStart(null);
      }
    } else if (activeTool === 'place-opening' && pendingOpeningType) {
      const snap = findNearestWall(walls, point, 2.0);
      if (snap) {
        insertStructuralAsset(pendingOpeningType, snap.wall.id, snap.offset);
        setHighlightedWallId(null);
      }
    } else if (activeTool === 'tape') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const axisInf = getAxisInference(drawingStart, point);
        addGuide({
          id: Math.random().toString(36).substr(2, 9),
          start: drawingStart,
          end: point,
          type: axisInf ? 'infinite' : 'segment'
        });
        setDrawingStart(null);
      }
    }
  };

  const handlePointerMove = (e: any) => {
    // -----------------------------------------------------------------
    // 🚧 ANULACIÓN DEL CALIBRADOR: Seguimiento de ratón flotante sin Snap
    // -----------------------------------------------------------------
    if (activeTool === 'scale-blueprint') {
      e.stopPropagation();
      
      // Detener el renderizado de líneas variables si ya estamos esperando al HUD de distancia
      if (useEditorStore.getState().calibrationState.step === 'awaiting-real-distance') {
        return; 
      }
      
      const exactPoint = [e.point.x, e.point.y, e.point.z] as [number, number, number];
      // Actualizar el estado manualmente para saltar la lógica de snap de R3F
      setActiveInference({ point: exactPoint, type: 'none', color: '#ec4899' }); // Magenta
      setMousePos(exactPoint);
      return;
    }
    // -----------------------------------------------------------------

    const rawPoint = [e.point.x, 0, e.point.z] as [number, number, number];
    
    if (extrudingFaceId) {
      // Usar delta Y en espacio de pantalla para calcular altura de extrusión.
      // e.nativeEvent.clientY da coordenadas en píxeles.
      const clientY = e.nativeEvent?.clientY ?? e.clientY;
      if (extrudeStartScreenY.current !== null && clientY !== undefined) {
        // Mover ratón ARRIBA (clientY menor) = aumentar altura
        // Escala: 1px ≈ 0.02m (sensibilidad ajustable)
        const deltaY = extrudeStartScreenY.current - clientY;
        const newHeight = Math.max(0.05, extrudeBaseHeight.current + deltaY * 0.03);
        setExtrusionHeight(newHeight);
      }
      return;
    }

  // 1. Detección de Inferencias
  const inf = snapEnabled 
    ? findInference(rawPoint, allSegments, 0.25, drawingStart, lockedAxis) 
    : { point: rawPoint, type: 'none', color: '#ffffff' } as SnapInference;
    
  const point = inf.point;

  // 2. Mover/Rotar/Escalar: TransformControls gestiona toda la interacción del puntero — omitir lógica del canvas
  // Nota: el evento dragging-changed del gizmo ya desactiva OrbitControls (makeDefault)

  // 3. Actualizar Estados
    setActiveInference(inf);
    setMousePos(point);

    if (activeTool === 'place-opening') {
      const wallSnap = findNearestWall(walls, point, 2.0);
      setHighlightedWallId(wallSnap ? wallSnap.wall.id : null);
    }

    // Snapping especializado para la herramienta de acotado
    if (activeTool === 'dimension') {
      const dimSnap = findDimensionSnap(point, dimensionSnapCandidates, 0.3);
      setDimensionSnap(dimSnap);
      if (dimSnap) {
        // Sobreescribir mousePos con el punto de snap de acotado
        setMousePos(dimSnap.point);
      }
    } else {
      setDimensionSnap(null);
    }
  };

  const handlePointerUp = (e?: any) => {
    if (extrudingFaceId) {
      const face = faces.find(f => f.id === extrudingFaceId);
      const finalHeight = Math.max(0.05, extrusionHeight);
      if (face && finalHeight > 0.05) {
        // Calcular el centroide como ancla de posición para el volumen
        const count = face.points.length;
        const sum = face.points.reduce(
          (acc, p) => [acc[0] + p[0], 0, acc[2] + p[2]],
          [0, 0, 0] as [number, number, number]
        );
        const avgCenter: [number, number, number] = [
          sum[0] / count,
          0,
          sum[2] / count,
        ];

        addVolume({
          id: Math.random().toString(36).substr(2, 9),
          basePoints: face.points,
          height: finalHeight,
          type: 'volume',
          position: avgCenter,
        });
        // Eliminar la cara de origen para que los volúmenes la reemplacen limpiamente
        useEditorStore.getState().removeItem(extrudingFaceId);
        useEditorStore.getState().saveToHistory();
      }
      // Siempre resetear el estado de extrusión al soltar el puntero
      setExtrudingFaceId(null);
      setExtrusionHeight(0);
      extrudeStartScreenY.current = null;
      extrudeBaseHeight.current = 0.1;
    }
  };

  // Actualizar FaceObject para soportar el inicio de extrusión
  const FaceWithExtrude: React.FC<{ face: FaceEntity }> = ({ face }) => {
    return (
      <group onPointerDown={(e) => {
        if (activeTool === 'extrude') {
          e.stopPropagation();
          // Registrar la posición Y de la pantalla al inicio del arrastre para el cálculo del delta de altura
          extrudeStartScreenY.current = e.nativeEvent?.clientY ?? null;
          extrudeBaseHeight.current = 0.1;
          setExtrudingFaceId(face.id);
          setExtrusionHeight(0.1);
        }
      }}>
        <FaceObject face={face} />
      </group>
    );
  };

  React.useEffect(() => {
    // Resetear estados de interacción cuando cambia la herramienta
    setDrawingStart(null);
    setExtrudingFaceId(null);
    setHighlightedWallId(null);
    setExtrusionHeight(0);
    setVcbInput('');
    setLockedAxis(null);
  }, [activeTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. Prevenir atajos al escribir en campos de texto
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      // 1. Selector rápido de herramientas (Estilo Sketchup)
      if (!e.ctrlKey && !e.metaKey) {
        const key = e.key.toUpperCase();
        if (e.code === 'Space') { e.preventDefault(); setActiveTool('select'); }
        else if (key === 'O') setActiveTool('orbit');
        else if (key === 'H') setActiveTool('pan');
        else if (key === 'L') setActiveTool('line');
        else if (key === 'R') setActiveTool('rectangle');
        else if (key === 'C') setActiveTool('circle');
        else if (key === 'W') setActiveTool('wall');
        else if (key === 'P') setActiveTool('extrude');
        else if (key === 'M') setActiveTool('move');
        else if (key === 'Q') setActiveTool('rotate');
        else if (key === 'S') setActiveTool('scale');
        else if (key === 'F') setActiveTool('offset');
        else if (key === 'T') setActiveTool('tape');
        else if (key === 'D') setActiveTool('dimension');
        else if (key === 'B') setActiveTool('paint');
        else if (key === 'E') setActiveTool('eraser');
        else if (key === 'K') setActiveTool('scale-blueprint');
      }

      // 2. Shift para bloqueo de eje
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        if (activeInference.type === 'axis' && activeInference.axis) {
          setLockedAxis(activeInference.axis);
        }
      }
      
      // 3. Control para modo copia
      if (e.key === 'Control') setIsCtrlPressed(true);

      // ── Clipboard: Ctrl+C / Ctrl+V ──
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        useEditorStore.getState().copySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        useEditorStore.getState().pasteSelection();
        return;
      }
      // ── Agrupación: Ctrl+G ──
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        useEditorStore.getState().groupSelection();
        return;
      }

      // 3. Captura numérica para VCB
      if (/^[0-9.]$/.test(e.key)) {
        setVcbInput(prev => prev + e.key);
        return;
      }
      if (e.key === 'Backspace' && vcbInput) {
        setVcbInput(prev => prev.slice(0, -1));
        return;
      }
      if (e.key === 'Enter' && vcbInput) {
        const val = parseFloat(vcbInput);
        if (!isNaN(val)) confirmVCB(val);
        setVcbInput("");
        return;
      }

      // 4. Escape / Enter para control de estado de la herramienta
      if (e.key === 'Escape') {
        if (vcbInput) {
          setVcbInput('');
        } else if (lockedAxis) {
          setLockedAxis(null);
        } else if (drawingStart) {
          setDrawingStart(null);
        } else {
          select(null);
        }
      }
      
      if (e.key === 'Enter' && !vcbInput && drawingStart) {
        setDrawingStart(null); // Terminar cadena
      }

      // 5. Eliminar selección
      if (e.key === 'Delete' || (e.key === 'Backspace' && !vcbInput)) {
        if (selectedIds.length > 0) removeItem();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setLockedAxis(null);
      }
      if (e.key === 'Control') setIsCtrlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [drawingStart, vcbInput, mousePos, activeInference, lockedAxis, selectedIds, activeTool]);

  const layerVisible = (id: string) => layers.find(l => l.id === id)?.visible !== false;

  const getCursorStyle = (tool: string): React.CSSProperties => {
    const createCursor = (svgContent: string, hotspotX = 12, hotspotY = 12, fallback = 'crosshair') => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="black" flood-opacity="0.3"/>
            </filter>
          </defs>
          <g filter="url(#shadow)">
            <path d="M12 2v6m0 8v6m-10-10h6m8 0h6" stroke="black" stroke-width="3" stroke-linecap="round"/>
            <path d="M12 2v6m0 8v6m-10-10h6m8 0h6" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <g transform="translate(16, 16) scale(0.6)">
              ${svgContent}
            </g>
          </g>
        </svg>
      `.replace(/\s+/g, ' ').trim();
      return { cursor: `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${hotspotX} ${hotspotY}, ${fallback}` };
    };

    switch (tool) {
      case 'wall':
        return createCursor('<path d="M2 4h20v16H2z" fill="white" stroke="black" stroke-width="2"/><path d="M2 12h20" stroke="black" stroke-width="2"/>');
      case 'line':
        return createCursor('<path d="M2 22l16-16 4 4-16 16z" fill="white" stroke="black" stroke-width="2"/><path d="M18 6l-4-4" stroke="black" stroke-width="2"/>');
      case 'rectangle':
        return createCursor('<rect x="3" y="3" width="18" height="14" fill="white" stroke="black" stroke-width="2" rx="1"/>');
      case 'circle':
        return createCursor('<circle cx="12" cy="12" r="9" fill="white" stroke="black" stroke-width="2"/>');
      case 'tape':
        return createCursor('<rect x="2" y="6" width="20" height="12" rx="3" fill="white" stroke="black" stroke-width="2"/><circle cx="8" cy="12" r="2" fill="black"/><path d="M16 6v12" stroke="black" stroke-width="2"/>');
      case 'dimension':
        return createCursor('<path d="M2 24v-6M22 24v-6M2 20h20" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M2 24v-6M22 24v-6M2 20h20" stroke="black" stroke-width="1.5" stroke-linecap="round"/>');
      case 'extrude':
        return createCursor('<path d="M12 2v20M6 8l6-6 6 6" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 2v20M6 8l6-6 6 6" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'place-opening':
        return createCursor('<path d="M6 22V6a2 2 0 012-2h8a2 2 0 012 2v16M14 14v2" fill="white" stroke="black" stroke-width="2" stroke-linecap="round"/>', 12, 12, 'copy');
      case 'orbit':
        return { cursor: `url('data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><circle cx="12" cy="12" r="10" fill="white" stroke-width="0"/><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="black"/><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="white" stroke-width="1"/></svg>')}') 12 12, all-scroll` };
      case 'move': case 'pan':
        return { cursor: 'grab' }; // CSS nativo
      case 'rotate':
        return { cursor: 'alias' };
      case 'scale':
        return { cursor: 'nwse-resize' };
      case 'select':
        return { cursor: 'default' };
      case 'eraser': case 'delete':
        return { cursor: 'not-allowed' };
      default:
        return { cursor: 'crosshair' };
    }
  };

  /* ── Menú Radial: abrir con clic derecho (solo si NO hubo arrastre) ── */
  const radialMenu = useRadialMenu();
  const rightDownRef = useRef<{ x: number; y: number } | null>(null);

  /* Registrar posición donde se presionó el botón derecho */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      rightDownRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  /* Solo abrir menú si el cursor no se movió (< 5px) — si se movió, fue pan de cámara */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const down = rightDownRef.current;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    rightDownRef.current = null;
    // Si el cursor se movió más de 5px, fue un gesto de paneo — no abrir menú
    if (dist > 5) return;
    const ctx: 'empty' | 'single' | 'multi' =
      selectedIds.length > 1 ? 'multi' :
      selectedIds.length === 1 ? 'single' :
      'empty';
    radialMenu.open(e.clientX, e.clientY, ctx);
  }, [selectedIds, radialMenu]);

  return (
    <main 
      className="flex-1 relative bg-zinc-50 overflow-hidden outline-none"
      style={getCursorStyle(activeTool)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDrawingStart(null);
      }}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          stencil: false,
          depth: true,
        }}
        dpr={[1, 1.5]}
        onPointerMissed={() => {
          // No deseleccionar si TransformControls está activo — hacer clic en las flechas del gizmo
          // dispara onPointerMissed porque no golpean ninguna malla de la escena.
          if (['move', 'rotate', 'scale'].includes(activeTool) && selectedIds.length > 0) return;
          select(null);
        }}
        onPointerUp={handlePointerUp}
      >
        <Suspense fallback={null}>
          {viewMode === '2D' ? (
            <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={80} rotation={[-Math.PI / 2, 0, 0]} />
          ) : (
            <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />
          )}
          
          <OrbitControls 
            makeDefault 
            enableRotate={viewMode === '3D' && !extrudingFaceId} 
            screenSpacePanning={true}
            enableDamping={true}
            dampingFactor={0.08}
            /* Velocidades optimizadas para mouse y trackpad */
            zoomSpeed={1.2}
            rotateSpeed={0.8}
            panSpeed={1.0}
            /* Límites de zoom razonables para no perder la escena */
            minDistance={0.5}
            maxDistance={200}
            minZoom={5}
            maxZoom={500}
            mouseButtons={{
              LEFT: activeTool === 'orbit' ? THREE.MOUSE.ROTATE : (activeTool === 'pan' ? THREE.MOUSE.PAN : undefined),
              MIDDLE: THREE.MOUSE.ROTATE,
              RIGHT: THREE.MOUSE.PAN
            }}
            /* Gestos táctiles: 1 dedo = rotar, 2 dedos = pan/zoom — estándar CAD */
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN
            }}
            /* Señales para el Intent Engine (Fase 4) */
            onStart={() => useIntentStore.getState().setNavigating(true)}
            onEnd={() => useIntentStore.getState().setNavigating(false)}
          />

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
          
          {/* 2D: Grid Drei suave */}
          {viewMode === '2D' && showGrid && (
            <Grid infiniteGrid cellSize={gridSize} sectionSize={gridSize * 5} sectionColor="#cbd5e1" cellColor="#f1f5f9" fadeDistance={100} />
          )}
          {/* 3D: GridHelper nativo con plano de referencia visible */}
          {viewMode === '3D' && (
            <Grid3DHelper gridSize={gridSize} />
          )}

          <ExportManager />
          <BlueprintObject 
            onPointerDown={handlePointerDown} 
            onPointerMove={handlePointerMove} 
          />

          <group>
            {/* Guías del entorno */}
            {guides.map(g => (
              <Line 
                key={g.id} 
                points={g.type === 'infinite' ? [
                  new THREE.Vector3().fromArray(g.start).add(new THREE.Vector3(g.end[0]-g.start[0], 0, g.end[2]-g.start[2]).normalize().multiplyScalar(-100)).toArray() as [number, number, number],
                  new THREE.Vector3().fromArray(g.start).add(new THREE.Vector3(g.end[0]-g.start[0], 0, g.end[2]-g.start[2]).normalize().multiplyScalar(100)).toArray() as [number, number, number]
                ] : [g.start, g.end]}
                color="#94a3b8"
                lineWidth={1}
                dashed
                dashSize={0.2}
                gapSize={0.1}
              />
            ))}

            {layerVisible('walls') && walls.map(w => <WallObject key={w.id} wall={w} />)}
            {layerVisible('openings') && openings.map(o => <OpeningObject key={o.id} opening={o} />)}
            {layerVisible('assets') && items.map((i: SceneItem) => <SceneItemObject key={i.id} item={i} />)}
            {layerVisible('dimensions') && dimensions.map(d => <DimensionLineObject key={d.id} dim={d} />)}
            {layerVisible('lines') && lines.map(l => <LineCADObject key={l.id} line={l} />)}
            {layerVisible('rectangles') && rectangles.map(r => <RectangleObject key={r.id} rect={r} />)}
            {layerVisible('faces') && faces.map(f => <FaceWithExtrude key={f.id} face={f} />)}
            {layerVisible('volumes') && volumes.map(v => <VolumeObject key={v.id} volume={v} />)}
            
            <SelectionBoundingBox />
            <MultiSelectionGizmo />

            {/* Indicador de Snap para herramienta de Acotado */}
            {activeTool === 'dimension' && dimensionSnap && (
              <group position={dimensionSnap.point}>
                {/* Punto magnético con halo pulsante */}
                <mesh renderOrder={1001}>
                  <sphereGeometry args={[0.04, 12, 12]} />
                  <meshBasicMaterial color={dimensionSnap.color} depthTest={false} transparent opacity={0.9} />
                </mesh>
                {/* Halo exterior */}
                <mesh renderOrder={1000}>
                  <ringGeometry args={[0.05, 0.07, 16]} />
                  <meshBasicMaterial color={dimensionSnap.color} depthTest={false} transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
                {/* Etiqueta del tipo de snap */}
                <Html distanceFactor={10} position={[0, 0.12, 0]} style={{ pointerEvents: 'none' }}>
                  <div
                    className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider whitespace-nowrap shadow-xl border"
                    style={{
                      backgroundColor: dimensionSnap.color + '22',
                      color: dimensionSnap.color,
                      borderColor: dimensionSnap.color + '44',
                    }}
                  >
                    {dimensionSnap.label}
                  </div>
                </Html>
              </group>
            )}
            
            {/* Previsualización en tiempo real */}
            {drawingStart && (
              <group>
                {/* Bloqueo de Calibración Visual cuando se espera la distancia real */}
                <Line 
                  points={[
                    drawingStart, 
                    useEditorStore.getState().calibrationState.step === 'awaiting-real-distance' 
                      ? mousePos 
                      : mousePos
                  ]} 
                  color={activeTool === 'scale-blueprint' ? "#ec4899" : (activeInference.type === 'axis' ? activeInference.color : "#3b82f6")} 
                  lineWidth={activeInference.type === 'axis' || activeTool === 'scale-blueprint' ? 3 : 2} 
                  dashed={activeInference.type !== 'axis' && activeTool !== 'scale-blueprint'} 
                />
                
                {/* Línea Guía de Eje (sensación infinita) */}
                {activeInference.type === 'axis' && (
                  <Line 
                    points={[
                      new THREE.Vector3().fromArray(drawingStart).add(new THREE.Vector3(
                        activeInference.axis === 'x' ? -100 : 0,
                        activeInference.axis === 'y' ? -100 : 0,
                        activeInference.axis === 'z' ? -100 : 0
                      )).toArray() as [number, number, number],
                      new THREE.Vector3().fromArray(drawingStart).add(new THREE.Vector3(
                        activeInference.axis === 'x' ? 100 : 0,
                        activeInference.axis === 'y' ? 100 : 0,
                        activeInference.axis === 'z' ? 100 : 0
                      )).toArray() as [number, number, number]
                    ]}
                    color={activeInference.color}
                    lineWidth={1}
                    transparent
                    opacity={0.3}
                  />
                )}

                <mesh position={drawingStart}>
                  <sphereGeometry args={[activeTool === 'scale-blueprint' ? 0.003 : 0.03, 8, 8]} />
                  <meshBasicMaterial color={activeTool === 'scale-blueprint' ? "#ec4899" : (activeInference.type === 'axis' ? activeInference.color : "#3b82f6")} />
                </mesh>
                {activeTool === 'rectangle' && (
                  <mesh 
                    position={[(drawingStart[0] + mousePos[0]) / 2, -0.001, (drawingStart[2] + mousePos[2]) / 2]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <planeGeometry args={[Math.abs(mousePos[0] - drawingStart[0]), Math.abs(mousePos[2] - drawingStart[2])]} />
                    <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
                  </mesh>
                )}

                {/* Previsualización profesional de cota en vivo */}
                {activeTool === 'dimension' && (
                  <DimensionLineObject
                    dim={{
                      id: '__preview__',
                      start: drawingStart,
                      end: mousePos,
                      value: calculateAlignedDistance(drawingStart, mousePos, detectAlignment(drawingStart, mousePos)),
                      unit: 'mm',
                      offset: calculateAutoOffset(),
                      alignment: detectAlignment(drawingStart, mousePos),
                    }}
                    isPreview={true}
                  />
                )}
              </group>
            )}

            {/* Previsualización de Extrusión */}
            {extrudingFaceId && (() => {
              const face = faces.find(f => f.id === extrudingFaceId);
              if (!face) return null;
              const shape = new THREE.Shape();
              shape.moveTo(face.points[0][0], face.points[0][2]);
              for (let i = 1; i < face.points.length; i++) shape.lineTo(face.points[i][0], face.points[i][2]);
              shape.closePath();
              
              return (
                <group rotation={[-Math.PI / 2, 0, 0]}>
                  <mesh>
                    <extrudeGeometry args={[shape, { depth: extrusionHeight, bevelEnabled: false }]} />
                    <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
                  </mesh>
                </group>
              );
            })()}

            <HUD 
              point={mousePos} 
              start={drawingStart || (extrudingFaceId ? [0,0,0] : null)} 
              tool={activeTool} 
              vcbValue={vcbInput}
              activeInference={activeInference}
            />

            <mesh
              position={[0, -0.01, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              onPointerDown={(e) => {
                // Si el gizmo está activo y el usuario hace clic en el canvas vacío, manejar acción por defecto
                handlePointerDown(e);
              }}
              onPointerMove={(e) => {
                handlePointerMove(e);
              }}
            >
              <planeGeometry args={[1000, 1000]} />
              <meshBasicMaterial transparent opacity={0} visible={false} />
            </mesh>
          </group>
        </Suspense>
      </Canvas>
    </main>
  );
};

