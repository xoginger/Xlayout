"use client";

import React, { Suspense, useState, useRef, useMemo, useEffect } from 'react';
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
  const selectedId = useEditorStore((state) => state.selectedId);
  const isSelected = selectedId === rect.id;

  const points = [
    [rect.start[0], 0, rect.start[2]],
    [rect.end[0], 0, rect.start[2]],
    [rect.end[0], 0, rect.end[2]],
    [rect.start[0], 0, rect.end[2]],
    [rect.start[0], 0, rect.start[2]]
  ] as [number, number, number][];

  return (
    <group onClick={(e) => { e.stopPropagation(); select(rect.id, 'rectangle'); }}>
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
        <meshBasicMaterial color={isSelected ? '#3b82f6' : '#27272a'} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const LineCADObject: React.FC<{ line: LineEntity }> = ({ line }) => {
  const select = useEditorStore((state) => state.select);
  const selectedId = useEditorStore((state) => state.selectedId);
  const isSelected = selectedId === line.id;

  return (
    <group onClick={(e) => { e.stopPropagation(); select(line.id, 'line'); }}>
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
  const selectedId = useEditorStore((state) => state.selectedId);
  const isSelected = selectedId === opening.id;
  
  if (!wall) return null;

  const wallLength = calculateDistance(wall.start, wall.end);
  const wallAngle = getWallAngle(wall.start, wall.end);
  const x = (opening.offset - 0.5) * wallLength;
  const center = getWallCenter(wall.start, wall.end);

  return (
    <group 
      position={center} 
      rotation={[0, -wallAngle, 0]} 
      onClick={(e) => { e.stopPropagation(); select(opening.id, 'opening'); }}
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
      {/* Small square/circle for the point */}
      <mesh renderOrder={1000}>
        {inference.type === 'midpoint' ? <boxGeometry args={[0.06, 0.06, 0.06]} /> : <sphereGeometry args={[0.04, 8, 8]} />}
        <meshBasicMaterial color={inference.color} depthTest={false} transparent opacity={0.8} />
      </mesh>
      
      {/* Label */}
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

const GltfModel: React.FC<{ url: string; item: SceneItem }> = ({ url, item }) => {
  const { scene } = useGLTF(url);
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    
    // Apply internal transformations based on model metadata
    const forwardAxis = item.metadata?.forwardAxis || 'Z';
    if (forwardAxis === 'X') clone.rotation.y = -Math.PI / 2;
    if (forwardAxis === '-X') clone.rotation.y = Math.PI / 2;
    if (forwardAxis === '-Z') clone.rotation.y = Math.PI;

    // Apply scale to the scene itself
    clone.scale.set(item.scale[0], item.scale[1], item.scale[2]);

    return clone;
  }, [scene, item.metadata?.forwardAxis, item.scale]);
  
  return <primitive object={clonedScene} />;
};

const SceneItemObject: React.FC<{ item: SceneItem }> = ({ item }) => {
  const { select, selectedId, activeTool, updateItem, viewMode, gridSize, snapEnabled, items } = useEditorStore();
  const isSelected = selectedId === item.id;
  const [activeSnap, setActiveSnap] = useState<SnapResult | null>(null);

  // groupRef is the actual THREE.Group for this item.
  // TransformControls uses object={groupRef} to attach directly to it,
  // so the gizmo appears at the group's real world position (item.position).
  const groupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);
  // isDragging ref: no store writes during drag — core crash-loop fix.
  const isDragging = useRef(false);

  const commitTransform = () => {
    const group = groupRef.current;
    if (!group) return;

    const pos = group.position;
    const rot = group.rotation;
    const scale = group.scale;

    // Professional Floor Alignment
    const currentHeight = item.height * scale.y;
    const minY = currentHeight * (item.floorAnchor ?? 0.5);
    let safeY = Math.max(pos.y, minY);

    let finalX = pos.x;
    let finalZ = pos.z;

    // 1. Modular Snap (Priority) — evaluated only at drop time
    const modularSnap = findModularSnap(item, items, 0.4);
    if (modularSnap) {
      finalX = modularSnap.snappedPosition[0];
      safeY = modularSnap.snappedPosition[1];
      finalZ = modularSnap.snappedPosition[2];
      setActiveSnap(modularSnap);
    } else {
      setActiveSnap(null);
      // 2. Grid Snap (Fallback) — only when Three.js built-in snap is off
      if (snapEnabled && activeTool === 'move' && !(transformRef.current?.translationSnap)) {
        finalX = Math.round(pos.x / gridSize) * gridSize;
        finalZ = Math.round(pos.z / gridSize) * gridSize;
      }
    }

    // Snap correction: push the final snapped position back to the Three.js object
    // so the gizmo is aligned after commit (before React reconciliation)
    group.position.set(finalX, safeY, finalZ);

    // Single store write — happens only on drag-end
    updateItem(item.id, {
      position: [finalX, safeY, finalZ],
      rotation: [rot.x, rot.y, rot.z],
      scale: [scale.x, scale.y, scale.z],
    });
  };

  const isInTransformMode = isSelected && ['move', 'rotate', 'scale'].includes(activeTool);
  // Skip scale gizmo if item is not resizable
  const isInTransformModeFinal = isInTransformMode && !(activeTool === 'scale' && item.resizable === false);
  const mode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale';

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
        The group is ALWAYS rendered in the scene at item.position.
        When TransformControls is active it uses object={groupRef} to attach
        directly to this group — gizmo appears at the group's real world position.
        We do NOT wrap this group inside TransformControls children to avoid the
        drei inner-wrapper-at-origin bug.
      */}
      <group
        ref={groupRef}
        position={item.position}
        rotation={item.rotation}
        onClick={(e) => { e.stopPropagation(); select(item.id, 'item'); }}
      >
        <Suspense fallback={placeholder}>
          {item.model3dUrl ? (
            <GltfModel url={item.model3dUrl} item={item} />
          ) : (
            placeholder
          )}
        </Suspense>

        {/* Visualizers for Snap Points */}
        {isSelected && item.snapPoints?.map(sp => (
          <SnapPointIndicator
            key={sp.id}
            position={sp.localPosition}
            active={activeSnap?.movingSnapPoint.id === sp.id}
          />
        ))}

        {viewMode === '2D' && item.label && (
          <Html position={[0, item.height * (1 - (item.floorAnchor ?? 0.5)) + 0.12, 0]} center>
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

      {isInTransformModeFinal && (
        <TransformControls
          ref={transformRef}
          object={groupRef}
          mode={mode as any}
          // No onChange — no store writes during drag. Core crash-loop fix preserved.
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
};



const DimensionLineObject: React.FC<{ dim: DimensionLine }> = ({ dim }) => {
  const select = useEditorStore((state) => state.select);
  const selectedId = useEditorStore((state) => state.selectedId);
  const isSelected = selectedId === dim.id;
  const distance = calculateDistance(dim.start, dim.end);

  const center = [
    (dim.start[0] + dim.end[0]) / 2,
    (dim.start[1] + dim.end[1]) / 2 + 0.1,
    (dim.start[2] + dim.end[2]) / 2
  ];

  return (
    <group onClick={(e) => { e.stopPropagation(); select(dim.id, 'dimension'); }}>
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
  const selectedId = useEditorStore((state) => state.selectedId);
  const viewMode = useEditorStore((state) => state.viewMode);
  const isSelected = selectedId === wall.id;

  const length = calculateDistance(wall.start, wall.end);
  const angle = getWallAngle(wall.start, wall.end);
  const center = getWallCenter(wall.start, wall.end);

  if (viewMode === '2D') {
    return (
      <group position={center as any} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall'); }}>
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
    <group position={center as any} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall'); }}>
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
  if (tool === 'select') return null;
  const distance = start ? calculateDistance(start, point) : 0;
  
  return (
    <>
      {/* 1. Floating Cursor Info */}
      <Html position={point} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center gap-1 -translate-y-12 transition-all duration-75">
          <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-700/50 px-2 py-1 rounded shadow-2xl flex items-center gap-2 ring-1 ring-white/10">
            <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase">{tool}</span>
            {start && (
              <>
                <div className="w-px h-3 bg-zinc-700/50"></div>
                <span className="text-[11px] font-mono text-white font-bold">{distance.toFixed(3)}m</span>
              </>
            )}
            {activeInference.type !== 'none' && (
              <div 
                className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter"
                style={{ backgroundColor: activeInference.color, color: '#fff' }}
              >
                {activeInference.label || activeInference.type}
              </div>
            )}
          </div>
        </div>
      </Html>

      {/* 2. Fixed VCB (SketchUp Style) */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 p-2">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-lg overflow-hidden flex divide-x divide-zinc-100 min-w-[120px] ring-1 ring-black/5">
            <div className="px-3 py-2 bg-zinc-50 flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Medidas</span>
            </div>
            <div className="px-4 py-2 flex items-center bg-white min-w-[80px]">
              <span className="text-sm font-mono font-bold text-zinc-800">
                {vcbValue || (start ? distance.toFixed(3) : "0.000")}
              </span>
              <span className="ml-1 text-[10px] text-zinc-400 font-bold">m</span>
              {vcbValue && <div className="ml-2 w-1.5 h-4 bg-blue-500 animate-pulse rounded-full" />}
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="bg-zinc-900/90 text-[8px] font-black text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-tighter">
              X: {point[0].toFixed(3)}
            </div>
            <div className="bg-zinc-900/90 text-[8px] font-black text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-tighter">
              Z: {point[2].toFixed(3)}
            </div>
          </div>
        </div>
      </Html>
    </>
  );
};

const FaceObject: React.FC<{ face: FaceEntity }> = ({ face }) => {
  const select = useEditorStore((state) => state.select);
  const selectedId = useEditorStore((state) => state.selectedId);
  const isSelected = selectedId === face.id;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (face.points.length < 3) return s;
    s.moveTo(face.points[0][0], face.points[0][2]);
    for (let i = 1; i < face.points.length; i++) {
      s.lineTo(face.points[i][0], face.points[i][2]);
    }
    s.closePath();
    return s;
  }, [face.points]);

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.0005, 0]}
      onClick={(e) => { e.stopPropagation(); select(face.id, 'face'); }}
    >
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial 
        color={isSelected ? '#3b82f6' : '#94a3b8'} 
        transparent 
        opacity={isSelected ? 0.4 : 0.2} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

const VolumeObject: React.FC<{ volume: VolumeEntity }> = ({ volume }) => {
  const { select, selectedId, activeTool, updateVolume } = useEditorStore();
  const isSelected = selectedId === volume.id;
  const volumeGroupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);
  const isDraggingVol = useRef(false);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (volume.basePoints.length < 3) return s;
    s.moveTo(volume.basePoints[0][0], volume.basePoints[0][2]);
    for (let i = 1; i < volume.basePoints.length; i++) {
      s.lineTo(volume.basePoints[i][0], volume.basePoints[i][2]);
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
        onClick={(e) => { e.stopPropagation(); select(volume.id, 'volume'); }}
      >
        <mesh castShadow receiveShadow>
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

      {isSelected && activeTool === 'move' && (
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
// Always visible in 3D view regardless of showGrid toggle.
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

export const Viewport: React.FC = () => {
  const { 
    items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, 
    select, activeTool, viewMode, selectedId,
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
  // For extrude: track screen Y at drag start to compute vertical delta
  const extrudeStartScreenY = useRef<number | null>(null);
  const extrudeBaseHeight = useRef<number>(0.1);
  const [vcbInput, setVcbInput] = useState('');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [transformStart, setTransformStart] = useState<[number, number, number] | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  
  const allSegments = useMemo(() => {
    // Collect all geometrical segments for snapping
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

    // Also include snap points from scene items
    items.forEach(item => {
      if (item.snapPoints) {
        item.snapPoints.forEach(sp => {
          const worldPos = new THREE.Vector3(...sp.localPosition)
            .multiply(new THREE.Vector3(...item.scale))
            .applyEuler(new THREE.Euler(...item.rotation))
            .add(new THREE.Vector3(...item.position))
            .toArray() as [number, number, number];
          // We treat snap points as zero-length segments for the endpoint snapping
          segs.push({ start: worldPos, end: worldPos });
        });
      }
    });

    return segs;
  }, [walls, lines, rectangles, items]);

  const confirmVCB = (value: number) => {
    if (!drawingStart) return;
    
    // Direction is either from mouse to start, or along the active inference axis
    const currentPoint = activeInference.type !== 'none' ? activeInference.point : mousePos;
    const dir = new THREE.Vector3().fromArray(currentPoint).sub(new THREE.Vector3().fromArray(drawingStart)).normalize();
    
    // If no clear direction yet, and we have an axis lock, use that axis
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

      // Input Numerical
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
      e.stopPropagation(); // Ignore Floor and under-objects
      const exactPoint = [e.point.x, e.point.y, e.point.z] as [number, number, number];

      if (!drawingStart) {
        setDrawingStart(exactPoint);
      } else {
        const measuredDist = calculateDistance(drawingStart, exactPoint);
        const realDistStr = prompt(
          `Distancia medida actual: ${measuredDist.toFixed(3)}m\n\nIngresa la distancia real (en metros) para calibrar el plano:`,
          measuredDist.toFixed(3)
        );
        
        if (realDistStr !== null) {
          let realDist = parseFloat(realDistStr.replace(',', '.')); // Soporte para comas
          if (!isNaN(realDist) && realDist > 0 && measuredDist > 0) {
            const factor = realDist / measuredDist;
            const store = useEditorStore.getState();
            store.updateBlueprint({ scale: store.blueprint.scale * factor });
          } else {
            alert('Valor ingresado inválido. La calibración ha sido cancelada.');
          }
        }
        
        setDrawingStart(null);
        useEditorStore.getState().setActiveTool('select');
      }
      return; // End early. Mathematical purity achieved.
    }
    // -----------------------------------------------------------------

    let point: [number, number, number] = e.forcedPoint || activeInference.point;
    
    // Grid snap fallback if no geometric inference
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
          
          // SketchUp-style: Detect closed loops
          const allLineSegments = [...lines, newLine].map(l => ({ start: l.start, end: l.end }));
          const loops = detectClosedLoops(allLineSegments);
          
          loops.forEach(loopPoints => {
            const faceId = 'face-' + Math.random().toString(36).substr(2, 5);
            addFace({ id: faceId, points: loopPoints, type: 'face' });
          });

          setDrawingStart(point); // Continuous chain
          setLockedAxis(null); // Release lock after click
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
        
        const rectPoints: [number, number, number][] = [
          [drawingStart[0], 0, drawingStart[2]],
          [drawingStart[0] + width, 0, drawingStart[2]],
          [drawingStart[0] + width, 0, drawingStart[2] + depth],
          [drawingStart[0], 0, drawingStart[2] + depth]
        ];
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
        addFace({ id: 'circle-' + Math.random().toString(36).substr(2, 5), points: circlePoints, type: 'face' });
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
    // 🚧 CALIBRATOR OVERRIDE: Floating mouse tracking without Snap
    // -----------------------------------------------------------------
    if (activeTool === 'scale-blueprint') {
      e.stopPropagation();
      const exactPoint = [e.point.x, e.point.y, e.point.z] as [number, number, number];
      
      // Update state manually to skip R3F's inference snap logic
      setActiveInference({ point: exactPoint, type: 'none', color: '#ec4899' }); // Magenta
      setMousePos(exactPoint);
      return;
    }
    // -----------------------------------------------------------------

    const rawPoint = [e.point.x, 0, e.point.z] as [number, number, number];
    
    if (extrudingFaceId) {
      // Use screen-space Y delta to compute extrusion height.
      // e.nativeEvent.clientY gives us pixel coordinates.
      const clientY = e.nativeEvent?.clientY ?? e.clientY;
      if (extrudeStartScreenY.current !== null && clientY !== undefined) {
        // Moving mouse UP (smaller clientY) = increase height
        // Scale: 1px ≈ 0.02m (adjustable sensitivity)
        const deltaY = extrudeStartScreenY.current - clientY;
        const newHeight = Math.max(0.05, extrudeBaseHeight.current + deltaY * 0.03);
        setExtrusionHeight(newHeight);
      }
      return;
    }

    // 1. Detection of Inferences
    const inf = snapEnabled 
      ? findInference(rawPoint, allSegments, 0.25, drawingStart, lockedAxis) 
      : { point: rawPoint, type: 'none', color: '#ffffff' } as SnapInference;
    
    const point = inf.point;

    // 2. Move/Rotate/Scale: TransformControls owns all pointer interaction — skip canvas logic
    // Note: the gizmo's dragging-changed event already disables OrbitControls (makeDefault)

    // 3. Update States
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
        // Compute centroid as position anchor for the volume
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
        // Remove the source face so volumes replace it cleanly
        useEditorStore.getState().removeItem(extrudingFaceId);
        useEditorStore.getState().saveToHistory();
      }
      // Always reset extrude state on pointer up
      setExtrudingFaceId(null);
      setExtrusionHeight(0);
      extrudeStartScreenY.current = null;
      extrudeBaseHeight.current = 0.1;
    }
  };

  // Update FaceObject to support extrusion start
  const FaceWithExtrude: React.FC<{ face: FaceEntity }> = ({ face }) => {
    return (
      <group onPointerDown={(e) => {
        if (activeTool === 'extrude') {
          e.stopPropagation();
          // Record the screen Y position at drag start for height delta calculation
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
    // Reset interaction states when tool changes
    setDrawingStart(null);
    setExtrudingFaceId(null);
    setHighlightedWallId(null);
    setExtrusionHeight(0);
    setVcbInput('');
    setLockedAxis(null);
  }, [activeTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Shift for Axis Lock
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        if (activeInference.type === 'axis' && activeInference.axis) {
          setLockedAxis(activeInference.axis);
        }
      }
      
      // 2. Control for Copy Mode (used elsewhere but handled here)
      if (e.key === 'Control') setIsCtrlPressed(true);

      // 3. Numerical Capture for VCB
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

      // 4. Escape / Enter for Tool State Control
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
        setDrawingStart(null); // Finish chain
      }

      // 5. Delete selection
      if (e.key === 'Delete' || (e.key === 'Backspace' && !vcbInput)) {
        if (selectedId) removeItem(selectedId);
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
  }, [drawingStart, vcbInput, mousePos, activeInference, lockedAxis, selectedId, activeTool]);

  const layerVisible = (id: string) => layers.find(l => l.id === id)?.visible !== false;

  return (
    <main 
      className={`flex-1 relative bg-zinc-50 overflow-hidden outline-none ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDrawingStart(null);
      }}
    >
      <Canvas
        shadows
        onPointerMissed={() => {
          // Don't deselect if TransformControls is active — clicking gizmo arrows
          // fires onPointerMissed because they don't hit any scene mesh.
          if (['move', 'rotate', 'scale'].includes(activeTool) && selectedId) return;
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
              LEFT: activeTool === 'select' ? THREE.MOUSE.ROTATE : undefined, 
              MIDDLE: THREE.MOUSE.ROTATE,
              RIGHT: THREE.MOUSE.PAN
            }}
          />

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
          
          {/* 2D: Grid drei suave */}
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
            {/* Environment Guides */}
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
            
            {/* Real-time Preview */}
            {drawingStart && (
              <group>
                <Line 
                  points={[drawingStart, mousePos]} 
                  color={activeTool === 'scale-blueprint' ? "#ec4899" : (activeInference.type === 'axis' ? activeInference.color : "#3b82f6")} 
                  lineWidth={activeInference.type === 'axis' || activeTool === 'scale-blueprint' ? 3 : 2} 
                  dashed={activeInference.type !== 'axis' && activeTool !== 'scale-blueprint'} 
                />
                
                {/* Axis Guide Line (Infinite feel) */}
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
                  <sphereGeometry args={[activeTool === 'scale-blueprint' ? 0.015 : 0.03, 8, 8]} />
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

            {/* Extrusion Preview */}
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
                // When TransformControls is active for a selected item, let the gizmo
                // exclusively own pointer events — do NOT forward to drawing tools.
                if (['move', 'rotate', 'scale'].includes(activeTool) && selectedId) return;
                handlePointerDown(e);
              }}
              onPointerMove={(e) => {
                // Same guard for move: skip canvas drag logic while gizmo is in control.
                if (['move', 'rotate', 'scale'].includes(activeTool) && selectedId) return;
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

