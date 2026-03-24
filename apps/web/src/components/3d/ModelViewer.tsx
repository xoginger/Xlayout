/**
 * Creado y diseñado por XO
 * XLayout System — Visor 3D de modelos GLB
 *
 * Componente React Three Fiber para preview de modelos 3D.
 * Soporta: rotar, zoom, pan con OrbitControls.
 */

"use client";

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ─── Componente interno: carga y muestra el modelo GLB ────────────────────────
const Model: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Calcular bounding box para auto-fit de cámara
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

    camera.position.set(center.x + distance * 0.5, center.y + distance * 0.3, center.z + distance);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [scene, camera]);

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={scene.clone()} />
      </group>
    </Center>
  );
};

// ─── Indicador de carga ───────────────────────────────────────────────────────
const LoadingFallback = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshStandardMaterial color="#94a3b8" wireframe />
  </mesh>
);

// ─── Componente principal del visor ───────────────────────────────────────────
export interface ModelViewerProps {
  /** URL del archivo GLB a visualizar */
  url: string;
  /** Altura del contenedor en px (por defecto 400) */
  height?: number;
  /** Color de fondo (por defecto gris oscuro) */
  backgroundColor?: string;
  /** Mostrar grid de referencia */
  showGrid?: boolean;
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  url,
  height = 400,
  backgroundColor = '#1e293b',
  showGrid = true,
}) => {
  return (
    <div
      style={{ width: '100%', height: `${height}px`, borderRadius: '12px', overflow: 'hidden' }}
      className="relative"
    >
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50, near: 0.01, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: backgroundColor }}
      >
        {/* Iluminación */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 2, -3]} intensity={0.4} />

        {/* Entorno HDR sutil */}
        <Environment preset="studio" />

        {/* Modelo 3D con suspense */}
        <Suspense fallback={<LoadingFallback />}>
          <Model url={url} />
        </Suspense>

        {/* Grid de referencia */}
        {showGrid && (
          <Grid
            infiniteGrid
            cellSize={0.5}
            sectionSize={2}
            cellColor="#475569"
            sectionColor="#64748b"
            fadeDistance={15}
            position={[0, -0.01, 0]}
          />
        )}

        {/* Controles de cámara: rotar, zoom, pan */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.5}
          maxDistance={50}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* Indicador de controles */}
      <div className="absolute bottom-3 left-3 flex gap-2 text-[10px] text-slate-400 font-mono pointer-events-none">
        <span className="bg-slate-800/70 px-2 py-0.5 rounded">🖱 Rotar</span>
        <span className="bg-slate-800/70 px-2 py-0.5 rounded">⚙ Scroll = Zoom</span>
        <span className="bg-slate-800/70 px-2 py-0.5 rounded">⇧ + Drag = Pan</span>
      </div>
    </div>
  );
};

export default ModelViewer;
