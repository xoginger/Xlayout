"use client";

import React, { Suspense, useState, useRef, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  TransformControls, 
  OrthographicCamera, 
  PerspectiveCamera, 
  Line, 
  Html
} from '@react-three/drei';
import { useEditorStore, SceneItem, Wall, DimensionLine, Opening, LineEntity, RectangleEntity } from '@/store/editor-store';
import { useCatalogStore } from '@/store/catalog-store';
import { CATEGORY_DIMENSIONS } from '@/types/catalog';
import { 
  snapPointToGrid, 
  getWallAngle, 
  getWallCenter, 
  calculateDistance, 
  findNearestEndpoint,
  getNearestPointOnSegment,
  getItemHalfHeight,
  clampToFloor
} from '@/utils/cad-math';
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
      {isSelected && (
        <>
          <mesh position={line.start}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          <mesh position={line.end}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </>
      )}
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

const SceneItemObject: React.FC<{ item: SceneItem }> = ({ item }) => {
  const { select, selectedId, activeTool, updateItem, viewMode } = useEditorStore();
  const isSelected = selectedId === item.id;
  const getProductById = useCatalogStore((s) => s.getProductById);

  const handleTransform = (e: any) => {
    if (e?.target?.object) {
      const { position, rotation, scale } = e.target.object;
      const minY = (item.boundingBox?.height ?? 1) / 2 * Math.max(scale.y, 0.01);
      const safeY = Math.max(position.y, minY);
      updateItem(item.id, {
        position: [position.x, safeY, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        scale: [scale.x, scale.y, scale.z],
      });
    }
  };

  // ── Catalog item placeholder ─────────────────────────────
  if (item.type === 'catalog-item' && item.boundingBox) {
    const bb = item.boundingBox;
    const product = item.productId ? getProductById(item.productId) : undefined;
    const catData = product ? CATEGORY_DIMENSIONS[product.category] : null;
    const baseColor = catData?.color ?? '#64748b';
    const color = isSelected ? '#3b82f6' : baseColor;

    const mesh = (
      <group
        position={item.position}
        rotation={item.rotation}
        scale={item.scale}
        onClick={(e) => { e.stopPropagation(); select(item.id, 'item'); }}
      >
        {/* Main body */}
        <mesh>
          <boxGeometry args={[bb.width, bb.height, bb.depth]} />
          <meshStandardMaterial
            color={color}
            metalness={0.1}
            roughness={0.8}
            transparent
            opacity={isSelected ? 0.9 : 0.75}
          />
        </mesh>
        {/* Wireframe outline for clarity */}
        <mesh>
          <boxGeometry args={[bb.width, bb.height, bb.depth]} />
          <meshBasicMaterial color={isSelected ? '#93c5fd' : '#94a3b8'} wireframe />
        </mesh>
        {/* Label in 2D view */}
        {viewMode === '2D' && item.label && (
          <Html position={[0, bb.height / 2 + 0.12, 0]} center>
            <div className={`text-[7px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded shadow whitespace-nowrap ${
              isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 text-zinc-100'
            }`}>
              {item.label}
            </div>
          </Html>
        )}
        {/* Footprint outline in 2D */}
        {viewMode === '2D' && (
          <Line
            points={[
              [-bb.width/2, 0.001, -bb.depth/2],
              [ bb.width/2, 0.001, -bb.depth/2],
              [ bb.width/2, 0.001,  bb.depth/2],
              [-bb.width/2, 0.001,  bb.depth/2],
              [-bb.width/2, 0.001, -bb.depth/2],
            ]}
            color={isSelected ? '#3b82f6' : '#475569'}
            lineWidth={isSelected ? 2 : 1.2}
          />
        )}
      </group>
    );

    if (isSelected && ['move', 'rotate', 'scale'].includes(activeTool)) {
      const mode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale';
      return <TransformControls mode={mode as any} onMouseUp={handleTransform}>{mesh}</TransformControls>;
    }
    return mesh;
  }

  // ── Legacy item (rack, desk, shelf, cabinet) ─────────────
  const getGeometry = () => {
    switch (item.type) {
      case 'rack': return <boxGeometry args={[1, 2, 0.5]} />;
      case 'desk': return <boxGeometry args={[1.5, 0.75, 0.8]} />;
      case 'shelf': return <boxGeometry args={[1, 1.8, 0.4]} />;
      case 'cabinet': return <boxGeometry args={[0.8, 1.2, 0.6]} />;
      default: return <boxGeometry />;
    }
  };

  const mesh = (
    <mesh
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={(e) => { e.stopPropagation(); select(item.id, 'item'); }}
    >
      {getGeometry()}
      <meshStandardMaterial color={isSelected ? '#3b82f6' : '#52525b'} metalness={0.5} roughness={0.2} />
    </mesh>
  );

  if (isSelected && ['move', 'rotate', 'scale'].includes(activeTool)) {
    const mode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale';
    return (
      <TransformControls mode={mode as any} onMouseUp={handleTransform}>
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
    // Architectural 2D: solid dark fill with crisp boundary lines
    return (
      <group position={center as any} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall'); }}>
        {/* Fill body */}
        <mesh position={[0, 0.001, 0]}>
          <boxGeometry args={[length, 0.002, wall.thickness]} />
          <meshBasicMaterial color={isSelected ? '#3b82f6' : '#27272a'} />
        </mesh>
        {/* Outer contour lines */}
        <Line 
          points={[[-length/2, 0.002, wall.thickness/2], [length/2, 0.002, wall.thickness/2], [length/2, 0.002, -wall.thickness/2], [-length/2, 0.002, -wall.thickness/2], [-length/2, 0.002, wall.thickness/2]]} 
          color={isSelected ? '#60a5fa' : '#52525b'} 
          lineWidth={isSelected ? 2 : 1.5} 
        />
        {/* End cap marks */}
        <Line points={[[-length/2, 0.002, wall.thickness/2], [-length/2, 0.002, -wall.thickness/2]]} color={isSelected ? '#60a5fa' : '#52525b'} lineWidth={isSelected ? 2 : 1.5} />
        <Line points={[[length/2, 0.002, wall.thickness/2], [length/2, 0.002, -wall.thickness/2]]} color={isSelected ? '#60a5fa' : '#52525b'} lineWidth={isSelected ? 2 : 1.5} />
        {/* Selection endpoint dots */}
        {isSelected && (
          <>
            <mesh position={[-length/2, 0.003, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color="#60a5fa" /></mesh>
            <mesh position={[length/2, 0.003, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color="#60a5fa" /></mesh>
          </>
        )}
      </group>
    );
  }

  // 3D extruded wall volume — consistent color regardless of creation mode
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
      {/* Top edge highlight */}
      <Line 
        points={[[-length/2, wall.height, 0], [length/2, wall.height, 0]]} 
        color={isSelected ? '#93c5fd' : '#94a3b8'} 
        lineWidth={isSelected ? 2 : 1} 
      />
    </group>
  );
};

export const Viewport: React.FC = () => {
  const { 
    items, walls, openings, dimensions, lines, rectangles, layers, 
    select, selectedId, selectedType, activeTool, viewMode,
    addWall, addDimension, addItem, addOpening, addLine, addRectangle,
    updateWall, updateLine, updateRectangle,
    duplicateItem,
    gridSize, snapEnabled, showGrid 
  } = useEditorStore();

  const [drawingStart, setDrawingStart] = useState<[number, number, number] | null>(null);
  const [mousePos, setMousePos] = useState<[number, number, number]>([0,0,0]);
  // Click-click Move transform anchor
  const [moveAnchor, setMoveAnchor] = useState<[number, number, number] | null>(null);
  // Click-click Rotate transform anchor
  const [rotateAnchor, setRotateAnchor] = useState<[number, number, number] | null>(null);
  // Guard flag: prevents onPointerMissed from clearing selection during mode switch
  const modeSwitchRef = useRef(false);
  const prevViewMode = useRef(viewMode);
  if (prevViewMode.current !== viewMode) {
    prevViewMode.current = viewMode;
    modeSwitchRef.current = true;
    setTimeout(() => { modeSwitchRef.current = false; }, 350);
  }

  const allSegments = useMemo(() => [
    ...walls.map(w => ({ start: w.start, end: w.end })),
    ...lines.map(l => ({ start: l.start, end: l.end }))
  ], [walls, lines]);

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return;
    
    let point = [e.point.x, 0, e.point.z] as [number, number, number];
    if (snapEnabled) {
      const snappedToEndpoint = findNearestEndpoint(point, allSegments);
      point = snappedToEndpoint || snapPointToGrid(point, gridSize);
    }

    if (activeTool === 'move' && selectedId && selectedType && ['wall', 'line', 'rectangle'].includes(selectedType)) {
      // Click-click move: first click = anchor, second click = destination
      if (!moveAnchor) {
        setMoveAnchor(point);
      } else {
        const dx = point[0] - moveAnchor[0];
        const dz = point[2] - moveAnchor[2];
        if (selectedType === 'wall') {
          const w = walls.find(x => x.id === selectedId);
          if (w) updateWall(selectedId, { start: [w.start[0]+dx, w.start[1], w.start[2]+dz], end: [w.end[0]+dx, w.end[1], w.end[2]+dz] });
        } else if (selectedType === 'line') {
          const l = lines.find(x => x.id === selectedId);
          if (l) updateLine(selectedId, { start: [l.start[0]+dx, l.start[1], l.start[2]+dz], end: [l.end[0]+dx, l.end[1], l.end[2]+dz] });
        } else if (selectedType === 'rectangle') {
          const r = rectangles.find(x => x.id === selectedId);
          if (r) updateRectangle(selectedId, { start: [r.start[0]+dx, r.start[1], r.start[2]+dz], end: [r.end[0]+dx, r.end[1], r.end[2]+dz] });
        }
        setMoveAnchor(null);
      }
    } else if (activeTool === 'rotate' && selectedId && selectedType === 'wall') {
      // Click-click rotate: rotate wall around its center by angular delta
      const w = walls.find(x => x.id === selectedId);
      if (!w) return;
      const cx = (w.start[0] + w.end[0]) / 2;
      const cz = (w.start[2] + w.end[2]) / 2;
      if (!rotateAnchor) {
        setRotateAnchor(point);
      } else {
        const refAngle = Math.atan2(rotateAnchor[2] - cz, rotateAnchor[0] - cx);
        const newAngle = Math.atan2(point[2] - cz, point[0] - cx);
        const delta = newAngle - refAngle;
        const halfLen = calculateDistance(w.start, w.end) / 2;
        const wallAngle = Math.atan2(w.end[2] - w.start[2], w.end[0] - w.start[0]);
        const finalAngle = wallAngle + delta;
        updateWall(selectedId, {
          start: [cx - Math.cos(finalAngle) * halfLen, w.start[1], cz - Math.sin(finalAngle) * halfLen],
          end:   [cx + Math.cos(finalAngle) * halfLen, w.end[1],   cz + Math.sin(finalAngle) * halfLen]
        });
        setRotateAnchor(null);
      }
    } else if (activeTool === 'wall') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        if (calculateDistance(drawingStart, point) > 0.1) {
          addWall({ id: Math.random().toString(36).substr(2, 9), start: drawingStart, end: point, thickness: 0.15, height: 2.70 });
          setDrawingStart(point);
        }
      }
    } else if (activeTool === 'line') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        if (calculateDistance(drawingStart, point) > 0.1) {
          addLine({ id: Math.random().toString(36).substr(2, 9), start: drawingStart, end: point, type: 'line' });
          setDrawingStart(point);
        }
      }
    } else if (activeTool === 'rectangle') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        const width = point[0] - drawingStart[0];
        const depth = point[2] - drawingStart[2];
        addRectangle({
          id: Math.random().toString(36).substr(2, 9),
          start: drawingStart,
          end: point,
          width,
          depth,
          type: 'rectangle'
        });
        setDrawingStart(null);
      }
    } else if (activeTool === 'dimension') {
      if (!drawingStart) {
        setDrawingStart(point);
      } else {
        addDimension({ id: Math.random().toString(36).substr(2, 9), start: drawingStart, end: point });
        setDrawingStart(null);
      }
    } else if (activeTool === 'product') {
      addItem({
        id: Math.random().toString(36).substr(2, 9),
        type: 'rack',
        position: [point[0], getItemHalfHeight('rack'), point[2]],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      });
    } else if (['door', 'window'].includes(activeTool)) {
      let nearestWall = null;
      let minDistance = Infinity;
      let offset = 0.5;

      for (const wall of walls) {
        const p = getNearestPointOnSegment([e.point.x, 0, e.point.z], wall.start, wall.end);
        const d = calculateDistance([e.point.x, 0, e.point.z], p);
        if (d < minDistance && d < 1.0) {
          minDistance = d;
          nearestWall = wall;
          const wallLen = calculateDistance(wall.start, wall.end);
          const distFromStart = calculateDistance(wall.start, p);
          offset = distFromStart / wallLen;
        }
      }

      if (nearestWall) {
        addOpening({
          id: Math.random().toString(36).substr(2, 9),
          wallId: nearestWall.id,
          type: activeTool as any,
          offset,
          width: activeTool === 'door' ? 0.9 : 1.2,
          height: activeTool === 'door' ? 2.1 : 1.2
        });
      }
    }
  };

  const handlePointerMove = (e: any) => {
    let point = [e.point.x, 0, e.point.z] as [number, number, number];
    if (snapEnabled) {
      const snappedToEndpoint = findNearestEndpoint(point, allSegments);
      point = snappedToEndpoint || snapPointToGrid(point, gridSize);
    }
    setMousePos(point);
  };

  const handleKeyDown = (e: any) => {
    // Don't fire when user is typing in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const store = useEditorStore.getState();

    if (e.key === 'Escape') {
      // Cancel drawing, move, rotate, and return to Select
      setDrawingStart(null);
      setMoveAnchor(null);
      setRotateAnchor(null);
      store.clearSelection();
      store.setActiveTool('select');
    } else if (e.key === 'v' || e.key === 'V') {
      setDrawingStart(null);
      setMoveAnchor(null);
      setRotateAnchor(null);
      store.setActiveTool('select');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (store.selectedId) {
        store.removeItem(store.selectedId);
        setMoveAnchor(null);
        setRotateAnchor(null);
      }
    } else if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      if (store.selectedId) store.duplicateItem(store.selectedId);
    } else if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      store.undo();
    } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      store.redo();
    }
  };

  const layerVisible = (id: string) => layers.find(l => l.id === id)?.visible !== false;

  return (
    <main 
      className={`flex-1 relative bg-zinc-50 overflow-hidden outline-none ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Canvas
        shadows
        onPointerMissed={() => { if (!modeSwitchRef.current) select(null); }}
      >
        <Suspense fallback={null}>
          {viewMode === '2D' ? (
            <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={80} rotation={[-Math.PI / 2, 0, 0]} />
          ) : (
            <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />
          )}
          
          <OrbitControls 
            makeDefault 
            enableRotate={viewMode === '3D'} 
            screenSpacePanning={viewMode === '2D'}
          />

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
          
          {showGrid && <Grid infiniteGrid cellSize={gridSize} sectionSize={gridSize * 5} sectionColor="#cbd5e1" cellColor="#f1f5f9" fadeDistance={100} />}

          <group>
            {layerVisible('walls') && walls.map(w => <WallObject key={w.id} wall={w} />)}
            {layerVisible('openings') && openings.map(o => <OpeningObject key={o.id} opening={o} />)}
            {layerVisible('assets') && items.map((i: SceneItem) => <SceneItemObject key={i.id} item={i} />)}
            {layerVisible('dimensions') && dimensions.map(d => <DimensionLineObject key={d.id} dim={d} />)}
            {layerVisible('lines') && lines.map(l => <LineObject key={l.id} line={l} />)}
            {layerVisible('rectangles') && rectangles.map(r => <RectangleObject key={r.id} rect={r} />)}
            
            {/* Move Anchor Gizmo */}
            {moveAnchor && activeTool === 'move' && (
              <group>
                {/* Anchor point sphere */}
                <mesh position={moveAnchor as any}>
                  <sphereGeometry args={[0.12, 12, 12]} />
                  <meshBasicMaterial color="#f97316" />
                </mesh>
                {/* Delta arrow line */}
                <Line points={[moveAnchor, mousePos]} color="#f97316" lineWidth={2} dashed dashSize={0.15} gapSize={0.1} />
                <mesh position={mousePos as any}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="#fb923c" />
                </mesh>
                <Html position={[(moveAnchor[0]+mousePos[0])/2, 0.1, (moveAnchor[2]+mousePos[2])/2] as any} center>
                  <div className="bg-orange-600 text-white text-[8px] px-2 py-0.5 rounded font-bold shadow-xl">
                    Δ {calculateDistance(moveAnchor, mousePos).toFixed(2)}m
                  </div>
                </Html>
              </group>
            )}

            {/* Rotate Anchor Gizmo */}
            {rotateAnchor && activeTool === 'rotate' && selectedId && selectedType === 'wall' && (() => {
              const w = walls.find(x => x.id === selectedId);
              if (!w) return null;
              const cx = (w.start[0] + w.end[0]) / 2;
              const cz = (w.start[2] + w.end[2]) / 2;
              const center3: [number,number,number] = [cx, 0.002, cz];
              const refAngle = Math.atan2(rotateAnchor[2]-cz, rotateAnchor[0]-cx);
              const newAngle = Math.atan2(mousePos[2]-cz, mousePos[0]-cx);
              const angleDeg = ((newAngle - refAngle) * 180 / Math.PI).toFixed(1);
              return (
                <group>
                  <mesh position={center3}>
                    <sphereGeometry args={[0.1, 12, 12]} />
                    <meshBasicMaterial color="#a855f7" />
                  </mesh>
                  <Line points={[center3, rotateAnchor]} color="#a855f7" lineWidth={1.5} dashed dashSize={0.15} gapSize={0.1} />
                  <Line points={[center3, mousePos]} color="#c084fc" lineWidth={2} />
                  <Html position={[cx+0.3, 0, cz+0.3] as any} center>
                    <div className="bg-purple-600 text-white text-[8px] px-2 py-0.5 rounded font-bold shadow-xl">
                      ↺ {angleDeg}°
                    </div>
                  </Html>
                </group>
              );
            })()}

            {(drawingStart && (activeTool === 'wall' || activeTool === 'line' || activeTool === 'dimension')) && (
               <group>
                  {/* Centerline */}
                  <Line points={[drawingStart, mousePos]} color={activeTool === 'wall' ? '#1e40af' : '#3b82f6'} lineWidth={activeTool === 'wall' ? 1 : 2} dashed={activeTool === 'wall'} dashSize={0.2} gapSize={0.1} />
                  {/* Wall body preview (only for wall tool) */}
                  {activeTool === 'wall' && (() => {
                    const wallLen = calculateDistance(drawingStart, mousePos);
                    const wallAngle = getWallAngle(drawingStart, mousePos);
                    const wallCenter = getWallCenter(drawingStart, mousePos);
                    const thickness = 0.15;
                    return (
                      <group position={wallCenter as any} rotation={[0, -wallAngle, 0]}>
                        <mesh position={[0, 0.001, 0]}>
                          <boxGeometry args={[wallLen, 0.002, thickness]} />
                          <meshBasicMaterial color="#3b82f6" transparent opacity={0.35} />
                        </mesh>
                        <Line 
                          points={[[-wallLen/2, 0.003, thickness/2], [wallLen/2, 0.003, thickness/2], [wallLen/2, 0.003, -thickness/2], [-wallLen/2, 0.003, -thickness/2], [-wallLen/2, 0.003, thickness/2]]}
                          color="#60a5fa" lineWidth={1.5}
                        />
                      </group>
                    );
                  })()}
                  <Html position={getWallCenter(drawingStart, mousePos) as any} center>
                    <div className={`text-white text-[8px] px-2 py-0.5 rounded font-bold shadow-xl ${
                      activeTool === 'wall' ? 'bg-indigo-700' : 'bg-blue-600'
                    }`}>
                      {activeTool === 'wall' ? '⬛ ' : ''}{calculateDistance(drawingStart, mousePos).toFixed(2)}m
                    </div>
                  </Html>
               </group>
            )}

            {(drawingStart && activeTool === 'rectangle') && (
              <group>
                <Line
                  points={[
                    [drawingStart[0], 0, drawingStart[2]],
                    [mousePos[0], 0, drawingStart[2]],
                    [mousePos[0], 0, mousePos[2]],
                    [drawingStart[0], 0, mousePos[2]],
                    [drawingStart[0], 0, drawingStart[2]]
                  ]}
                  color="#3b82f6"
                  lineWidth={2}
                />
                <Html position={[(drawingStart[0] + mousePos[0]) / 2, 0, (drawingStart[2] + mousePos[2]) / 2] as any} center>
                   <div className="bg-white/90 border border-blue-200 p-2 rounded shadow-xl flex flex-col items-center gap-1 backdrop-blur-md">
                      <div className="flex gap-3 text-[9px] font-mono whitespace-nowrap">
                         <span className="text-zinc-500">W: <span className="text-blue-400">{Math.abs(mousePos[0] - drawingStart[0]).toFixed(2)}m</span></span>
                         <span className="text-zinc-500">D: <span className="text-blue-400">{Math.abs(mousePos[2] - drawingStart[2]).toFixed(2)}m</span></span>
                      </div>
                      <div className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">Rectangle Preview</div>
                   </div>
                </Html>
              </group>
            )}

            {/* Invisible floor plane to catch pointer events on empty space */}
            <mesh 
              position={[0, -0.01, 0]} 
              rotation={[-Math.PI / 2, 0, 0]} 
              onPointerDown={handlePointerDown} 
              onPointerMove={handlePointerMove}
            >
              <planeGeometry args={[1000, 1000]} />
              <meshBasicMaterial transparent opacity={0} visible={false} />
            </mesh>

            <mesh position={mousePos}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
            </mesh>
          </group>
        </Suspense>
      </Canvas>
      
      {/* HUD & Version Indicator */}
      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            <div className="bg-white/90 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-lg flex items-center gap-3 shadow-sm ring-1 ring-black/5">
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">{viewMode}</span>
              <div className="h-3 w-px bg-zinc-200" />
              <span className="text-[9px] font-mono text-zinc-500">X: {mousePos[0].toFixed(2)} Z: {mousePos[2].toFixed(2)}</span>
            </div>
            {activeTool !== 'select' && (
              <div className="bg-blue-600 px-3 py-1.5 rounded-lg text-white text-[10px] font-bold shadow-lg ring-1 ring-blue-400/50">
                TOOL: {activeTool.toUpperCase()} {drawingStart ? '(DRAFTING)' : ''}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
           <div className={`backdrop-blur-sm border px-3 py-1 rounded-md text-[9px] font-mono shadow-sm ring-1 transition-all ${
             activeTool === 'select'
               ? 'bg-blue-50/90 border-blue-200 text-blue-700 ring-blue-500/20'
               : activeTool === 'wall'
               ? 'bg-violet-50/90 border-violet-200 text-violet-700 ring-violet-500/20'
               : ['rectangle', 'line'].includes(activeTool)
               ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 ring-indigo-500/20'
               : 'bg-white/80 border-zinc-200 text-zinc-600 ring-black/5'
           }`}>
              <span className="text-zinc-500">Tool: </span>
              <span className="font-black">{activeTool.toUpperCase()}</span>
              <span className="text-zinc-300 mx-1">|</span>
              <span className="text-zinc-500">Version: </span>
              <span className="font-bold">
                {activeTool === 'select' ? 'transform-tool-v1'
                  : activeTool === 'rectangle' ? 'rectangle-tool-v1'
                  : activeTool === 'line' ? 'line-tool-v1'
                  : activeTool === 'wall' ? 'wall-color-parity-v1'
                  : activeTool === 'move' ? 'transform-tool-v1'
                  : activeTool === 'rotate' ? 'transform-tool-v1'
                  : activeTool === 'duplicate' ? 'transform-tool-v1'
                  : `${activeTool}-v1`}
              </span>
              <span className="text-zinc-300 mx-1">|</span>
              <span className="text-zinc-500">Build: 2026-03-16</span>
           </div>
        </div>
      </div>
    </main>
  );
};
