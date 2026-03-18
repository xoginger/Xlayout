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
  VolumeEntity 
} from '@/store/editor-store';
import { 
  snapPointToGrid, 
  getWallAngle, 
  getWallCenter, 
  calculateDistance, 
  getNearestPointOnSegment,
  findNearestEndpoint,
  findNearestMidpoint,
  getOrthogonalPoint,
  detectClosedLoops,
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

const LineObject: React.FC<{ line: LineEntity }> = ({ line }) => {
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

  const handleTransform = () => {
    const controls = transformRef.current;
    if (!controls || !controls.object) return;

    const { position, rotation, scale } = controls.object;
    
    // Professional Floor Alignment
    const currentHeight = item.height * scale.y;
    const minY = currentHeight * (item.floorAnchor ?? 0.5);
    let safeY = Math.max(position.y, minY);

    // Absolute Grid Snapping for Move tool
    let finalX = position.x;
    let finalZ = position.z;
    
    // 1. Modular Snap (Priority)
    const modularSnap = findModularSnap(item, items, 0.4);
    if (modularSnap) {
      finalX = modularSnap.snappedPosition[0];
      safeY = modularSnap.snappedPosition[1];
      finalZ = modularSnap.snappedPosition[2];
      setActiveSnap(modularSnap);
    } else {
      setActiveSnap(null);
      // 2. Grid Snap (Fallback)
      if (snapEnabled && activeTool === 'move') {
        finalX = Math.round(position.x / gridSize) * gridSize;
        finalZ = Math.round(position.z / gridSize) * gridSize;
      }
    }
    
    updateItem(item.id, {
      position: [finalX, safeY, finalZ],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [scale.x, scale.y, scale.z],
    });
  };

  const transformRef = useRef<any>(null);

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

  const mesh = (
    <group
      position={item.position}
      rotation={item.rotation}
      // Note: we don't apply scale to the outer group to avoid gizmo distortion
      // Scale is applied to the individual mesh/model components
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
  );

  if (isSelected && ['move', 'rotate', 'scale'].includes(activeTool)) {
    // If not resizable, don't show Scale gizmo
    if (activeTool === 'scale' && item.resizable === false) return mesh;

    const mode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale';
    
    return (
      <TransformControls 
        ref={transformRef}
        mode={mode as any} 
        onChange={handleTransform}
        onMouseDown={() => useEditorStore.getState().saveToHistory()}
        onMouseUp={() => useEditorStore.getState().saveToHistory()}
        translationSnap={snapEnabled && mode === 'translate' ? gridSize : null}
        rotationSnap={snapEnabled && mode === 'rotate' ? Math.PI / 12 : null} // 15 degrees snap
        size={0.75}
      >
        {mesh}
      </TransformControls>
    );
  }
  return mesh;
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

const HUD: React.FC<{ point: [number, number, number]; start?: [number, number, number] | null; tool: string }> = ({ point, start, tool }) => {
  if (tool === 'select') return null;
  const distance = start ? calculateDistance(start, point) : 0;
  
  return (
    <Html position={point} center style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center gap-1 -translate-y-12">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{tool}</span>
          {start && (
            <>
              <div className="w-px h-3 bg-zinc-700"></div>
              <span className="text-xs font-mono text-white font-bold">{distance.toFixed(2)}m</span>
            </>
          )}
        </div>
        <div className="text-[9px] font-mono text-zinc-500 bg-white/50 px-1.5 py-0.5 rounded border border-zinc-200 shadow-sm leading-none">
          {point[0].toFixed(2)} / {point[2].toFixed(2)}
        </div>
      </div>
    </Html>
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
  const transformRef = useRef<any>(null);

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

  const handleTransform = () => {
    if (!transformRef.current) return;
    const { position } = transformRef.current.object;
    updateVolume(volume.id, { position: [position.x, position.y, position.z] });
  };

  const mesh = (
    <group 
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
  );

  if (isSelected && activeTool === 'move') {
    return (
      <TransformControls 
        ref={transformRef}
        mode="translate" 
        onChange={handleTransform}
        onMouseDown={() => useEditorStore.getState().saveToHistory()}
        onMouseUp={() => useEditorStore.getState().saveToHistory()}
      >
        {mesh}
      </TransformControls>
    );
  }

  return mesh;
};

const BlueprintRenderer: React.FC<{ blueprint: any }> = ({ blueprint }) => {
  const texture = useTexture(blueprint.url) as any;
  const { width, height } = texture.image;
  const aspect = width / height;
  
  const baseWidth = 10 * blueprint.scale;
  const baseHeight = baseWidth / aspect;

  return (
    <mesh 
      position={blueprint.position} 
      rotation={[-Math.PI / 2, 0, blueprint.rotation]}
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

const BlueprintObject: React.FC = () => {
  const { blueprint } = useEditorStore();
  if (!blueprint.url || !blueprint.visible) return null;

  return (
    <Suspense fallback={null}>
      <BlueprintRenderer blueprint={blueprint} />
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

export const Viewport: React.FC = () => {
  const { 
    items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, 
    select, activeTool, viewMode,
    addWall, addDimension, addOpening, addLine, addRectangle, addFace, addVolume,
    updateWall, updateLine, updateRectangle,
    gridSize, snapEnabled, showGrid,
    pendingOpeningType, insertStructuralAsset, setPendingOpeningType,
    blueprint, updateBlueprint, setActiveTool
  } = useEditorStore();

  const [drawingStart, setDrawingStart] = useState<[number, number, number] | null>(null);
  const [mousePos, setMousePos] = useState<[number, number, number]>([0,0,0]);
  const [highlightedWallId, setHighlightedWallId] = useState<string | null>(null);
  const [extrudingFaceId, setExtrudingFaceId] = useState<string | null>(null);
  const [extrusionHeight, setExtrusionHeight] = useState<number>(0);
  
  const allSegments = useMemo(() => [
    ...walls.map(w => ({ start: w.start, end: w.end })),
    ...lines.map(l => ({ start: l.start, end: l.end }))
  ], [walls, lines]);

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return;
    
    let point = [e.point.x, 0, e.point.z] as [number, number, number];
    if (snapEnabled) {
      const snappedToEndpoint = findNearestEndpoint(point, allSegments);
      const snappedToMidpoint = findNearestMidpoint(point, allSegments);
      point = snappedToEndpoint || snappedToMidpoint || snapPointToGrid(point, gridSize);
      
      if (drawingStart && e.shiftKey) {
        point = getOrthogonalPoint(drawingStart, point);
      }
    }

    if (activeTool === 'extrude') {
      // Find if we clicked a face
      // Since Three.js raycasting handles clicks, we rely on FaceObject's onClick
      // but for "drag-extrude" we might need to intercept it here or in FaceObject.
      // For now, let's assume the user selects a face first, OR we detect it here.
      return; 
    }

    if (activeTool === 'wall') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        if (calculateDistance(drawingStart, point) > 0.05) {
          const id = Math.random().toString(36).substr(2, 9);
          addWall({ id, start: drawingStart, end: point, thickness: 0.15, height: 2.70 });
          
          const currentSegments = [
            ...walls.map(w => ({ start: w.start, end: w.end })),
            ...lines.map(l => ({ start: l.start, end: l.end })),
            { start: drawingStart, end: point }
          ];
          const loops = detectClosedLoops(currentSegments);
          if (loops.length > 0) {
            const loop = loops[loops.length - 1];
            addFace({ id: Math.random().toString(36).substr(2, 9), points: loop, type: 'face' });
          }

          setDrawingStart(point);
        }
      }
    } else if (activeTool === 'line') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        if (calculateDistance(drawingStart, point) > 0.01) {
          const id = Math.random().toString(36).substr(2, 9);
          addLine({ id, start: drawingStart, end: point, type: 'line' });
          
          const currentSegments = [
            ...walls.map(w => ({ start: w.start, end: w.end })),
            ...lines.map(l => ({ start: l.start, end: l.end })),
            { start: drawingStart, end: point }
          ];
          const loops = detectClosedLoops(currentSegments);
          if (loops.length > 0) {
            const loop = loops[loops.length - 1];
            addFace({
              id: Math.random().toString(36).substr(2, 9),
              points: loop,
              type: 'face'
            });
          }
          
          setDrawingStart(point);
        }
      }
    } else if (activeTool === 'rectangle') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const width = point[0] - drawingStart[0];
        const depth = point[2] - drawingStart[2];
        const id = Math.random().toString(36).substr(2, 9);
        addRectangle({
          id,
          start: drawingStart,
          end: point,
          width,
          depth,
          type: 'rectangle'
        });

        // For rectangles, we can directly add a face
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
    } else if (activeTool === 'place-opening' && pendingOpeningType) {
      const snap = findNearestWall(walls, point, 2.0);
      if (snap) {
        insertStructuralAsset(pendingOpeningType, snap.wall.id, snap.offset);
        setHighlightedWallId(null);
      }
    } else if (activeTool === 'scale-blueprint') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const pixelDist = calculateDistance(drawingStart, point);
        const realDistStr = prompt("Enter real distance between these points (meters):", "5");
        if (realDistStr) {
          const realDist = parseFloat(realDistStr);
          if (!isNaN(realDist) && pixelDist > 0) {
            // NewScale = CurrentScale * (RealDist / PixelDist)
            const newScale = blueprint.scale * (realDist / pixelDist);
            updateBlueprint({ scale: newScale });
            setActiveTool('select');
          }
        }
        setDrawingStart(null);
      }
    }
  };

  const handlePointerMove = (e: any) => {
    let point = [e.point.x, e.point.y, e.point.z] as [number, number, number];
    
    if (extrudingFaceId) {
      // Logic for vertical extrusion height
      // We use the Y difference or just mouse Y if possible
      const height = Math.max(0.1, e.point.y);
      setExtrusionHeight(height);
      return;
    }

    const groundPoint = [e.point.x, 0, e.point.z] as [number, number, number];
    if (snapEnabled) {
      const snappedToEndpoint = findNearestEndpoint(groundPoint, allSegments);
      const snappedToMidpoint = findNearestMidpoint(groundPoint, allSegments);
      point = snappedToEndpoint || snappedToMidpoint || snapPointToGrid(groundPoint, gridSize);
      
      if (drawingStart && e.shiftKey) {
        point = getOrthogonalPoint(drawingStart, point);
      }
    } else {
      point = groundPoint;
    }
    setMousePos(point);

    if (activeTool === 'place-opening') {
      const snap = findNearestWall(walls, point, 2.0);
      setHighlightedWallId(snap ? snap.wall.id : null);
    } else if (highlightedWallId) {
      setHighlightedWallId(null);
    }
  };

  const handlePointerUp = () => {
    if (extrudingFaceId) {
      const face = faces.find(f => f.id === extrudingFaceId);
      if (face) {
        const center = face.points.reduce((acc, p) => [acc[0] + p[0], 0, acc[2] + p[2]], [0, 0, 0]);
        const count = face.points.length;
        const avgCenter = [center[0] / count, 0, center[2] / count] as [number, number, number];

        addVolume({
          id: Math.random().toString(36).substr(2, 9),
          basePoints: face.points,
          height: extrusionHeight,
          type: 'volume',
          position: avgCenter
        });
        useEditorStore.getState().removeItem(extrudingFaceId);
      }
      setExtrudingFaceId(null);
      setExtrusionHeight(0);
    }
  };

  // Update FaceObject to support extrusion start
  const FaceWithExtrude: React.FC<{ face: FaceEntity }> = ({ face }) => {
    return (
      <group onPointerDown={(e) => {
        if (activeTool === 'extrude') {
          e.stopPropagation();
          setExtrudingFaceId(face.id);
          setExtrusionHeight(0.1);
        }
      }}>
        <FaceObject face={face} />
      </group>
    );
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingStart(null);
        setExtrudingFaceId(null);
        select(null);
      }
      if (e.key === 'Enter') {
        setDrawingStart(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId, removeItem } = useEditorStore.getState();
        if (selectedId) removeItem(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [select, activeTool]);

  const layerVisible = (id: string) => layers.find(l => l.id === id)?.visible !== false;

  return (
    <main 
      className={`flex-1 relative bg-zinc-50 overflow-hidden outline-none ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDrawingStart(null);
      }}
    >
      <Canvas shadows onPointerMissed={() => select(null)} onPointerUp={handlePointerUp}>
        <Suspense fallback={null}>
          {viewMode === '2D' ? (
            <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={80} rotation={[-Math.PI / 2, 0, 0]} />
          ) : (
            <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />
          )}
          
          <OrbitControls 
            makeDefault 
            enableRotate={viewMode === '3D' && !extrudingFaceId} 
            screenSpacePanning={viewMode === '2D'}
          />

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
          
          {showGrid && <Grid infiniteGrid cellSize={gridSize} sectionSize={gridSize * 5} sectionColor="#cbd5e1" cellColor="#f1f5f9" fadeDistance={100} />}

          <ExportManager />
          <BlueprintObject />

          <group>
            {layerVisible('walls') && walls.map(w => <WallObject key={w.id} wall={w} />)}
            {layerVisible('openings') && openings.map(o => <OpeningObject key={o.id} opening={o} />)}
            {layerVisible('assets') && items.map((i: SceneItem) => <SceneItemObject key={i.id} item={i} />)}
            {layerVisible('dimensions') && dimensions.map(d => <DimensionLineObject key={d.id} dim={d} />)}
            {layerVisible('lines') && lines.map(l => <LineObject key={l.id} line={l} />)}
            {layerVisible('rectangles') && rectangles.map(r => <RectangleObject key={r.id} rect={r} />)}
            {layerVisible('faces') && faces.map(f => <FaceWithExtrude key={f.id} face={f} />)}
            {layerVisible('volumes') && volumes.map(v => <VolumeObject key={v.id} volume={v} />)}
            
            {/* Real-time Preview */}
            {drawingStart && (
              <group>
                <Line points={[drawingStart, mousePos]} color="#3b82f6" lineWidth={2} dashed />
                <mesh position={drawingStart}>
                  <sphereGeometry args={[0.03, 8, 8]} />
                  <meshBasicMaterial color="#3b82f6" />
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

            <HUD point={mousePos} start={drawingStart || (extrudingFaceId ? [0,0,0] : null)} tool={activeTool} />

            <mesh 
              position={[0, -0.01, 0]} 
              rotation={[-Math.PI / 2, 0, 0]} 
              onPointerDown={handlePointerDown} 
              onPointerMove={handlePointerMove}
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

