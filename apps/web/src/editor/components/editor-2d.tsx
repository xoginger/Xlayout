"use client";

import React from 'react';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';
import { useEditorStore } from '../state/store';
import { MovePlacementCommand } from '../commands/MovePlacementCommand';

export const Editor2D = () => {
  const { scene, executeCommand } = useEditorStore();

  return (
    <div className="w-full h-full bg-slate-50 relative overflow-hidden">
      <Stage width={typeof window !== 'undefined' ? window.innerWidth : 800} height={typeof window !== 'undefined' ? window.innerHeight : 600}>
        <Layer>
          {/* Grid Background Pattern */}
          <Rect 
            width={typeof window !== 'undefined' ? window.innerWidth : 800} 
            height={typeof window !== 'undefined' ? window.innerHeight : 600} 
            fillPatternImage={createGridPattern() as any} 
          />
          
          {/* Render Walls */}
          {scene.walls.map(wall => (
            <Line
              key={wall.id}
              points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
              stroke="black"
              strokeWidth={wall.thickness}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {/* Render Placements (Furniture) */}
          {scene.placements.map(placement => (
            <Rect
              key={placement.id}
              x={placement.position.x}
              y={placement.position.y}
              width={60} 
              height={60} 
              fill="#3b82f6"
              rotation={placement.rotation.z}
              draggable
              onDragEnd={(e) => {
                executeCommand(new MovePlacementCommand(placement.id, { x: e.target.x(), y: e.target.y(), z: 0 }));
              }}
              shadowBlur={5}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

function createGridPattern() {
  if (typeof window === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(40, 40);
    ctx.lineTo(40, 0);
    ctx.stroke();
  }
  return canvas;
}
