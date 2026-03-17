"use client";

import React, { Suspense, useState, useRef, useMemo } from 'react';
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
import { 
  snapPointToGrid, 
  getWallAngle, 
  getWallCenter, 
  calculateDistance, 
  getNearestPointOnSegment,
  findNearestEndpoint,
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

  const handleTransform = (e: any) => {
    if (e?.target?.object) {
      const { position, rotation, scale } = e.target.object;
      // Floor clamping logic (Z height or Y height depending on interpretation)
      // In this R3F setup, Y is UP.
      const minY = item.height / 2 * Math.max(scale.y, 0.01);
      const safeY = Math.max(position.y, minY);
      
      updateItem(item.id, {
        position: [position.x, safeY, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        scale: [scale.x, scale.y, scale.z],
      });
    }
  };

  const color = isSelected ? '#3b82f6' : '#64748b';

  const mesh = (
    <group
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={(e) => { e.stopPropagation(); select(item.id, 'item'); }}
    >
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

      {viewMode === '2D' && item.label && (
        <Html position={[0, item.height / 2 + 0.12, 0]} center>
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
    const mode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale';
    return <TransformControls mode={mode as any} onMouseUp={handleTransform}>{mesh}</TransformControls>;
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

export const Viewport: React.FC = () => {
  const { 
    items, walls, openings, dimensions, lines, rectangles, layers, 
    select, activeTool, viewMode,
    addWall, addDimension, addOpening, addLine, addRectangle,
    updateWall, updateLine, updateRectangle,
    gridSize, snapEnabled, showGrid 
  } = useEditorStore();

  const [drawingStart, setDrawingStart] = useState<[number, number, number] | null>(null);
  const [mousePos, setMousePos] = useState<[number, number, number]>([0,0,0]);
  
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

    if (activeTool === 'wall') {
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

  const layerVisible = (id: string) => layers.find(l => l.id === id)?.visible !== false;

  return (
    <main 
      className={`flex-1 relative bg-zinc-50 overflow-hidden outline-none ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
      tabIndex={0}
    >
      <Canvas shadows onPointerMissed={() => select(null)}>
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
