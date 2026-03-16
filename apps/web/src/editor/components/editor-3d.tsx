"use client";

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import { useEditorStore } from '../state/store';
import * as THREE from 'three';

export const Editor3D = () => {
  const { scene } = useEditorStore();

  return (
    <div className="w-full h-full bg-slate-900 absolute top-0 left-0">
      <Canvas camera={{ position: [0, 500, 500], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 200, 50]} intensity={1} castShadow />
        
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>

        {/* Walls */}
        {scene.walls.map(wall => <Wall3D key={wall.id} wall={wall} />)}

        {/* Placements */}
        {scene.placements.map(placement => (
           <Box 
              key={placement.id} 
              position={[placement.position.x, placement.position.y || 30, placement.position.z]} 
              args={[60, 60, 60]} // Width, height, depth
            >
              <meshStandardMaterial color="#3b82f6" />
           </Box>
        ))}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

const Wall3D = ({ wall }: { wall: any }) => {
  // Simple math to convert A -> B line to a 3D Box
  const distance = Math.sqrt(Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2));
  const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
  
  const midX = (wall.start.x + wall.end.x) / 2;
  const midZ = (wall.start.y + wall.end.y) / 2; // Y in 2D is Z in 3D

  return (
    <mesh position={[midX, wall.height / 2, midZ]} rotation={[0, -angle, 0]} castShadow>
      <boxGeometry args={[distance, wall.height, wall.thickness]} />
      <meshStandardMaterial color="#e2e8f0" />
    </mesh>
  );
};
