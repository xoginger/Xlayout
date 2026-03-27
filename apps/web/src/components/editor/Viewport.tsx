/**
 * Creado y diseñado por XO
 */

"use client";

import React, { Suspense, useState, useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  TransformControls,
  OrthographicCamera,
  PerspectiveCamera,
  Line,
  Html,
  useGLTF,
  useTexture
} from '@react-three/drei';
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
import { exportEngine } from '@/utils/export-engine';
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

  return (
    <group position={[0, h / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial 
          color="#e2e8f0" 
          roughness={0.8}
          metalness={0.1} 
        />
      </mesh>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.15} />
      </mesh>
    </group>
  );
};

const GltfModel: React.FC<{ url: string; item: SceneItem }> = ({ url, item }) => {
  const { scene } = useGLTF(url);
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    
    // Aplicar transformaciones internas basadas en metadatos del modelo
    const forwardAxis = item.metadata?.forwardAxis || 'Z';
    if (forwardAxis === 'X') clone.rotation.y = -Math.PI / 2;
    if (forwardAxis === '-X') clone.rotation.y = Math.PI / 2;
    if (forwardAxis === '-Z') clone.rotation.y = Math.PI;

    // Aplicar escala a la escena misma
    clone.scale.set(item.scale[0], item.scale[1], item.scale[2]);

    // Alineación Profesional al Suelo:
    // Computamos el BoundingBox geométrico estricto del clon para identificar su punto físico más bajo.
    // Luego bajamos el origen para que su base física toque Y=0 localmente dentro del SceneItemObject.
    const box = new THREE.Box3().setFromObject(clone);
    if (box.min.y !== Infinity && box.max.y !== -Infinity) {
      clone.position.y = -box.min.y;
    }

    return clone;
  }, [scene, item.metadata?.forwardAxis, item.scale]);
  
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

  // groupRef es el THREE.Group real para este objeto.
  // TransformControls usa object={groupRef} para acoplarse directamente a él,
  // así el gizmo aparece en la posición real del mundo (item.position).
  const groupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);
  // ref isDragging: sin escrituras al store durante el arrastre — corrección de bucle de crash.
  const isDragging = useRef(false);

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
    const modularSnap = findModularSnap(item, items, 0.4);
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

  const color = isSelected ? '#3b82f6' : '#64748b';

  const placeholder = (
    <>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[item.width, item.height, item.depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={isSelected ? 0.9 : 0.75}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[item.width, item.height, item.depth]} />
        <meshBasicMaterial color={isSelected ? '#93c5fd' : '#94a3b8'} wireframe />
      </mesh>
    </>
  );

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
          // Sin onChange — sin escrituras al store durante el arrastre. Corrección de bucle de crash preservada.
          onMouseDown={() => {
            isDragging.current = true;
            useEditorStore.getState().saveToHistory();
          }}
          onMouseUp={() => {
            isDragging.current = false;
            commitTransform();
          }}
          translationSnap={snapEnabled && mode === 'translate' ? gridSize : null}
          rotationSnap={snapEnabled && mode === 'rotate' ? Math.PI / 12 : null}
          size={0.75}
        />
      )}
    </>
  );
});
SceneItemObject.displayName = 'SceneItemObject';

const DimensionLineObject: React.FC<{ dim: DimensionLine }> = ({ dim }) => {
  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isSelected = selectedIds.includes(dim.id);
  const distance = calculateDistance(dim.start, dim.end);

  const center = [
    (dim.start[0] + dim.end[0]) / 2,
    (dim.start[1] + dim.end[1]) / 2 + 0.1,
    (dim.start[2] + dim.end[2]) / 2
  ];

  return (
    <group onClick={(e) => { e.stopPropagation(); select(dim.id, 'dimension', e.shiftKey); }}>
      <Line
        points={[dim.start, dim.end]}
        color={isSelected ? '#3b82f6' : '#60a5fa'}
        lineWidth={2}
      />
      <Html position={center as any} center scale={0.5}>
        <div className="bg-zinc-900 border border-zinc-800 px-1 rounded text-[8px] font-mono text-blue-400 whitespace-nowrap shadow-lg ring-1 ring-blue-500/20">
          {distance.toFixed(2)}m
        </div>
      </Html>
    </group>
  );
};

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
  const { select, selectedIds, activeTool, updateVolume } = useEditorStore();
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
  const { blueprint } = useEditorStore();
  if (!blueprint.url || !blueprint.visible) return null;

  return (
    <Suspense fallback={null}>
      <BlueprintRenderer blueprint={blueprint} onPointerDown={onPointerDown} onPointerMove={onPointerMove} />
    </Suspense>
  );
};

const ExportManager: React.FC = () => {
  const { gl, scene, camera } = useThree();
  const { exportRequest, clearExportRequest, project, items } = useEditorStore();

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
  const { selectedIds, items, walls, lines, rectangles, activeTool, updateItem, updateWall, updateLine, updateRectangle, gridSize, snapEnabled } = useEditorStore();
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
  } = useEditorStore();

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
  
  const allSegments = useMemo(() => {
    // Recolectar todos los segmentos geométricos para el ajuste (snap)
    const segs: { start: [number, number, number], end: [number, number, number] }[] = [];
    
    walls.forEach(w => segs.push({ start: w.start, end: w.end }));
    lines.forEach(l => segs.push({ start: l.start, end: l.end }));
    rectangles.forEach(r => {
      const p1 = [r.start[0], 0, r.start[2]] as [number, number, number];
      const p2 = [r.start[0] + r.width, 0, r.start[2]] as [number, number, number];
      const p3 = [r.start[0] + r.width, 0, r.start[2] + r.depth] as [number, number, number];
      const p4 = [r.start[0], 0, r.start[2] + r.depth] as [number, number, number];
      segs.push({ start: p1, end: p2 }, { start: p2, end: p3 }, { start: p3, end: p4 }, { start: p4, end: p1 });
    });

    // También incluir puntos de ajuste de los objetos de la escena
    items.forEach(item => {
      if (item.snapPoints) {
        item.snapPoints.forEach(sp => {
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
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        addDimension({ id: Math.random().toString(36).substr(2, 9), start: drawingStart, end: point });
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
      // 1. Shift para bloqueo de eje
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        if (activeInference.type === 'axis' && activeInference.axis) {
          setLockedAxis(activeInference.axis);
        }
      }
      
      // 2. Control para modo copia
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

  const getCursorClass = (tool: string) => {
    switch (tool) {
      case 'move': case 'pan': return 'cursor-grab active:cursor-grabbing';
      case 'rotate': return 'cursor-alias';
      case 'scale': return 'cursor-nwse-resize';
      case 'select': return 'cursor-default';
      case 'zoom': return 'cursor-zoom-in';
      case 'eraser': case 'delete': return 'cursor-not-allowed';
      default: return 'cursor-crosshair';
    }
  };

  return (
    <main 
      className={`flex-1 relative bg-zinc-50 overflow-hidden outline-none ${getCursorClass(activeTool)}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDrawingStart(null);
      }}
    >
      <Canvas
        shadows
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
            mouseButtons={{
              LEFT: undefined, 
              MIDDLE: THREE.MOUSE.ROTATE,
              RIGHT: THREE.MOUSE.PAN
            }}
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

