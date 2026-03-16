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
        <planeGeometry args={[Math.abs(rect.width), Math.abs(rect.height)]} />
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
  const { select, selectedId, activeTool, updateItem } = useEditorStore();
  const isSelected = selectedId === item.id;

  const handleTransform = (e: any) => {
    if (e?.target?.object) {
      const { position, rotation, scale } = e.target.object;
      // Clamp Y so the item can never sink below the floor (Y=0)
      const minY = getItemHalfHeight(item.type) * Math.max(scale.y, 0.01);
      const safeY = Math.max(position.y, minY);
      updateItem(item.id, {
        position: [position.x, safeY, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        scale: [scale.x, scale.y, scale.z],
      });
    }
  };

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
    return (
      <group position={center} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall'); }}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[length, 0.01, wall.thickness]} />
          <meshStandardMaterial color={isSelected ? '#3b82f6' : '#27272a'} transparent opacity={0.6} />
        </mesh>
        <Line 
          points={[[-length/2, 0, wall.thickness/2], [length/2, 0, wall.thickness/2]]} 
          color={isSelected ? '#3b82f6' : '#71717a'} 
          lineWidth={1} 
        />
        <Line 
          points={[[-length/2, 0, -wall.thickness/2], [length/2, 0, -wall.thickness/2]]} 
          color={isSelected ? '#3b82f6' : '#71717a'} 
          lineWidth={1} 
        />
      </group>
    );
  }

  return (
    <group position={center} rotation={[0, -angle, 0]} onClick={(e) => { e.stopPropagation(); select(wall.id, 'wall'); }}>
      <mesh position={[0, wall.height / 2, 0]}>
        <boxGeometry args={[length, wall.height, wall.thickness]} />
        <meshStandardMaterial color={isSelected ? '#3b82f6' : '#d4d4d8'} metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
};

export const Viewport: React.FC = () => {
  const { 
    items, walls, openings, dimensions, lines, rectangles, layers, 
    select, activeTool, viewMode, addWall, addDimension, addItem, addOpening, addLine, addRectangle, gridSize, snapEnabled, showGrid 
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
          addWall({ id: Math.random().toString(36).substr(2, 9), start: drawingStart, end: point, thickness: 0.2, height: 2.5 });
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
        const height = point[2] - drawingStart[2];
        addRectangle({
          id: Math.random().toString(36).substr(2, 9),
          start: drawingStart,
          end: point,
          width,
          height,
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
    if (e.key === 'Escape') {
      setDrawingStart(null);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedId, removeItem } = useEditorStore.getState();
      if (selectedId) {
        removeItem(selectedId);
      }
    }
  };

  const layerVisible = (id: string) => layers.find(l => l.id === id)?.visible !== false;

  return (
    <main 
      className="flex-1 relative bg-zinc-950 overflow-hidden cursor-crosshair outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Canvas
        shadows
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerMissed={() => select(null)}
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

          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          
          {showGrid && <Grid infiniteGrid cellSize={gridSize} sectionSize={gridSize * 5} sectionColor="#3b82f6" cellColor="#27272a" />}

          <group>
            {layerVisible('walls') && walls.map(w => <WallObject key={w.id} wall={w} />)}
            {layerVisible('openings') && openings.map(o => <OpeningObject key={o.id} opening={o} />)}
            {layerVisible('assets') && items.map((i: SceneItem) => <SceneItemObject key={i.id} item={i} />)}
            {layerVisible('dimensions') && dimensions.map(d => <DimensionLineObject key={d.id} dim={d} />)}
            {layerVisible('lines') && lines.map(l => <LineObject key={l.id} line={l} />)}
            {layerVisible('rectangles') && rectangles.map(r => <RectangleObject key={r.id} rect={r} />)}
            
            {(drawingStart && (activeTool === 'wall' || activeTool === 'line' || activeTool === 'dimension')) && (
               <group>
                  <Line points={[drawingStart, mousePos]} color="#3b82f6" lineWidth={2} />
                  <Html position={getWallCenter(drawingStart, mousePos) as any} center>
                    <div className="bg-blue-600 text-white text-[8px] px-1 rounded font-bold shadow-xl">
                      {calculateDistance(drawingStart, mousePos).toFixed(2)}m
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
                   <div className="bg-zinc-900 border border-blue-500/50 p-2 rounded shadow-2xl flex flex-col items-center gap-1 backdrop-blur-md">
                      <div className="flex gap-3 text-[9px] font-mono whitespace-nowrap">
                         <span className="text-zinc-500">W: <span className="text-blue-400">{Math.abs(mousePos[0] - drawingStart[0]).toFixed(2)}m</span></span>
                         <span className="text-zinc-500">H: <span className="text-blue-400">{Math.abs(mousePos[2] - drawingStart[2]).toFixed(2)}m</span></span>
                      </div>
                      <div className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">Rectangle Preview</div>
                   </div>
                </Html>
              </group>
            )}

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
            <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-3 shadow-2xl ring-1 ring-white/5">
              <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase">{viewMode}</span>
              <div className="h-3 w-px bg-zinc-800" />
              <span className="text-[9px] font-mono text-zinc-400">X: {mousePos[0].toFixed(2)} Z: {mousePos[2].toFixed(2)}</span>
            </div>
            {activeTool !== 'select' && (
              <div className="bg-blue-600 px-3 py-1.5 rounded-lg text-white text-[10px] font-bold shadow-lg ring-1 ring-blue-400/50">
                TOOL: {activeTool.toUpperCase()} {drawingStart ? '(DRAFTING)' : ''}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
           <div className={`backdrop-blur-sm border px-3 py-1 rounded-md text-[9px] font-mono shadow-xl ring-1 transition-all ${
             activeTool === 'rectangle'
               ? 'bg-blue-950/90 border-blue-500/60 text-blue-300 ring-blue-500/30 shadow-blue-900/30'
               : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 ring-white/5'
           }`}>
              <span className={activeTool === 'rectangle' ? 'text-blue-400 font-bold' : 'text-zinc-600'}>Tool: </span>
              <span className={activeTool === 'rectangle' ? 'text-white font-black' : 'text-zinc-400'}>{activeTool.toUpperCase()}</span>
              <span className="text-zinc-600 mx-1">|</span>
              <span className={activeTool === 'rectangle' ? 'text-blue-400' : 'text-zinc-600'}>Version: </span>
              <span className={activeTool === 'rectangle' ? 'text-blue-200 font-bold' : 'text-zinc-400'}>rectangle-tool-v1</span>
              <span className="text-zinc-600 mx-1">|</span>
              <span className="text-zinc-600">Build: </span>
              <span className={activeTool === 'rectangle' ? 'text-blue-300' : 'text-zinc-400'}>2026-03-16</span>
           </div>
        </div>
      </div>
    </main>
  );
};
