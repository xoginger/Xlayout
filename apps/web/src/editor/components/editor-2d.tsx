"use client";

import React from 'react';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';
import { useEditorStore } from '../state/store';

export const Editor2D = () => {
  const { scene, movePlacement } = useEditorStore();

  return (
    <div className="w-full h-full bg-slate-50 relative overflow-hidden">
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {/* Grid Background Pattern */}
          <Rect 
            width={window.innerWidth} height={window.innerHeight} 
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
              width={60} // Placeholder for product width
              height={60} // Placeholder for product depth
              fill="#3b82f6"
              rotation={placement.rotation.z}
              draggable
              onDragEnd={(e) => {
                movePlacement(placement.id, e.target.x(), e.target.y(), 0);
              }}
              shadowBlur={5}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

// Simple utility to create a repeating grid pattern
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
